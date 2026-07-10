import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { EmbedSportexMatch, EmbedSportexResponse } from "../types"

const EMBEDSPORTEX_API = "https://api.esportex.site/api/streams"
const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const APPROACHING_LIVE_MS = 30 * 60 * 1000 // 30 minutes before kickoff

// ─── Public Types ────────────────────────────────────────────────────────────

export interface LiveMatchSource {
  id: string
  streamNo: number
  language: string
  hd: boolean
  embedUrl: string
  source: string
  viewers: number
}

export interface LiveMatch {
  id: string
  title: string
  category: string
  embedUrl: string
  date: number
  teams: {
    home: { name: string; badge: string }
    away: { name: string; badge: string }
  }
  source: string
  viewers: number
  sources: LiveMatchSource[]
}

interface PollingStatus {
  isPolling: boolean
  lastFetch: Date | null
  error: string | null
}

interface LiveStreamContextType {
  liveMatch: LiveMatch | null
  setLiveMatch: (match: LiveMatch | null) => void
  pollingStatus: PollingStatus
  nextUpcoming: { title: string; date: number; teams: { home: { name: string; badge: string }; away: { name: string; badge: string } } } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseKickoff(kickoff: string): number {
  // Format: "2026-07-03 02:00" in WIB (UTC+7)
  return new Date(kickoff.replace(" ", "T") + "+07:00").getTime()
}

function parseTeamFromTag(tag: string): { home: string; away: string } {
  // Tag format: "Spain vs Austria" or "Team A vs Team B"
  const parts = tag.split(" vs ")
  if (parts.length === 2) {
    return { home: parts[0].trim(), away: parts[1].trim() }
  }
  // Fallback: split by " - " or use the whole tag
  const dashParts = tag.split(" - ")
  if (dashParts.length === 2) {
    return { home: dashParts[0].trim(), away: dashParts[1].trim() }
  }
  return { home: tag, away: "" }
}

function flattenMatches(response: EmbedSportexResponse): EmbedSportexMatch[] {
  return response.football || []
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

const LiveStreamContext = createContext<LiveStreamContextType>({
  liveMatch: null,
  setLiveMatch: () => {},
  pollingStatus: { isPolling: false, lastFetch: null, error: null },
  nextUpcoming: null,
})

function findLiveOrApproachingMatch(matches: Array<{ slug: string; kickoff: string; endTime: string }>): { slug: string; kickoff: string } | null {
  const now = Date.now()

  const liveMatch = matches.find((m) => {
    const start = parseKickoff(m.kickoff)
    const end = parseKickoff(m.endTime)
    return now >= start && now <= end
  })
  if (liveMatch) return { slug: liveMatch.slug, kickoff: liveMatch.kickoff }

  const approachingMatch = matches.find((m) => {
    const start = parseKickoff(m.kickoff)
    const diff = start - now
    return diff > 0 && diff <= APPROACHING_LIVE_MS
  })
  if (approachingMatch) return { slug: approachingMatch.slug, kickoff: approachingMatch.kickoff }

  return null
}

// ─── EmbedSportex Fetcher ────────────────────────────────────────────────────

async function fetchFromEmbedSportex(): Promise<{ match: LiveMatch | null; upcoming: { title: string; date: number; teams: { home: { name: string; badge: string }; away: { name: string; badge: string } } } | null }> {
  const res = await fetch(EMBEDSPORTEX_API, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`EmbedSportex HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error("EmbedSportex returned unsuccessful response")

  const allMatches = flattenMatches(json as EmbedSportexResponse)
  if (!allMatches.length) return { match: null, upcoming: null }

  const target = findLiveOrApproachingMatch(allMatches)

  if (!target) {
    const now = Date.now()
    const next = allMatches.find((m) => parseKickoff(m.kickoff) > now)
    if (next) {
      const teams = parseTeamFromTag(next.tag)
      return {
        match: null,
        upcoming: {
          title: next.tag,
          date: parseKickoff(next.kickoff),
          teams: {
            home: { name: teams.home, badge: "" },
            away: { name: teams.away, badge: "" },
          },
        },
      }
    }
    return { match: null, upcoming: null }
  }

  const matchData = allMatches.find((m) => m.slug === target.slug)
  if (!matchData || !matchData.iframes?.length) return { match: null, upcoming: null }

  const teams = parseTeamFromTag(matchData.tag)
  const allSources: LiveMatchSource[] = matchData.iframes.map((iframe, index) => ({
    id: matchData.slug,
    streamNo: index + 1,
    language: iframe.server,
    hd: iframe.server.includes("HD") || iframe.server.includes("FHD"),
    embedUrl: iframe.url,
    source: iframe.server,
    viewers: 0,
  }))
  const bestSource = allSources.find((s) => s.hd) || allSources[0]

  return {
    match: {
      id: matchData.slug,
      title: matchData.tag,
      category: matchData.league,
      embedUrl: bestSource.embedUrl,
      date: parseKickoff(matchData.kickoff),
      teams: {
        home: { name: teams.home, badge: "" },
        away: { name: teams.away, badge: "" },
      },
      source: bestSource.source,
      viewers: 0,
      sources: allSources,
    },
    upcoming: null,
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function LiveStreamProvider({ children }: { children: ReactNode }) {
  const [liveMatch, setLiveMatchState] = useState<LiveMatch | null>(null)
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({
    isPolling: false,
    lastFetch: null,
    error: null,
  })
  const [nextUpcoming, setNextUpcoming] = useState<LiveStreamContextType["nextUpcoming"]>(null)
  const mountedRef = useRef(true)
  const fetchedMatchIdRef = useRef<string | null>(null)

  const setLiveMatch = useCallback((match: LiveMatch | null) => {
    setLiveMatchState(match)
    if (match) {
      fetchedMatchIdRef.current = match.id
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    async function poll() {
      if (!mountedRef.current) return

      setPollingStatus((prev) => ({ ...prev, isPolling: true }))

      let result: { match: LiveMatch | null; upcoming: { title: string; date: number; teams: { home: { name: string; badge: string }; away: { name: string; badge: string } } } | null } | null = null
      let lastError: string | null = null

      try {
        result = await fetchFromEmbedSportex()
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : "EmbedSportex failed"
      }

      if (!mountedRef.current) return

      if (result?.match) {
        if (fetchedMatchIdRef.current !== result.match.id) {
          setLiveMatchState(result.match)
          fetchedMatchIdRef.current = result.match.id
        }
        setNextUpcoming(null)
        setPollingStatus({ isPolling: false, lastFetch: new Date(), error: null })
      } else {
        setNextUpcoming(result?.upcoming ?? null)
        setPollingStatus({
          isPolling: false,
          lastFetch: new Date(),
          error: lastError,
        })
      }
    }

    void poll()
    const interval = setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  return (
    <LiveStreamContext.Provider value={{ liveMatch, setLiveMatch, pollingStatus, nextUpcoming }}>
      {children}
    </LiveStreamContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLiveStream = () => useContext(LiveStreamContext)
