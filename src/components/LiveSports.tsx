import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Calendar,
  Play,
  Clock,
  AlertTriangle,
  Monitor,
  Zap,
  CircleDot,
  Shield,
  Volleyball,
  Target,
  Swords,
  Car,
  Timer,
  Users,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import type { Match, MatchDetail } from "../types"
import SportsPlayer from "./SportsPlayer"

interface Source {
  id: string
  streamNo: number
  language: string
  hd: boolean
  embedUrl: string
  source: string
  viewers: number
}

// ─── API Adapter ──────────────────────────────────────────────────────────────

const APIS = {
  streamfree: { base: "https://streamfree.top/api/v1" },
  esportex:   { base: "https://api.esportex.site/api" },
}

const CACHE_TTL = 120_000 // 2 min cache
const API_TIMEOUT = 6_000 // 6s timeout per API call

interface CacheEntry<T> {
  data: T
  ts: number
}

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`ls_cache_${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL) {
      sessionStorage.removeItem(`ls_cache_${key}`)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() }
    sessionStorage.setItem(`ls_cache_${key}`, JSON.stringify(entry))
  } catch {
    // sessionStorage full or unavailable, ignore
  }
}

const CATEGORY_MAP: Record<string, { streamfree: string; esportex: string }> = {
  football:          { streamfree: "soccer",       esportex: "football" },
  cricket:           { streamfree: "cricket",      esportex: "cricket" },
  basketball:        { streamfree: "basketball",   esportex: "basketball" },
  "american-football": { streamfree: "football",   esportex: "amfootball" },
  hockey:            { streamfree: "hockey",       esportex: "hockey" },
  baseball:          { streamfree: "baseball",     esportex: "baseball" },
  "motor-sports":    { streamfree: "racing",       esportex: "race" },
  fight:             { streamfree: "combat",       esportex: "fight" },
  tennis:            { streamfree: "tennis",       esportex: "tennis" },
}

function parseTeamFromTag(tag: string): { home: string; away: string } {
  const parts = tag.split(" vs ")
  if (parts.length === 2) return { home: parts[0].trim(), away: parts[1].trim() }
  const dashParts = tag.split(" - ")
  if (dashParts.length === 2) return { home: dashParts[0].trim(), away: dashParts[1].trim() }
  return { home: tag, away: "" }
}

function parseKickoff(kickoff: string): number {
  return new Date(kickoff.replace(" ", "T") + "+07:00").getTime()
}

// StreamFree → normalized Match
function normalizeStreamFree(raw: any): Match & { _viewers: number; _embedUrl: string } {
  let homeName = raw.team1?.name || ""
  let awayName = raw.team2?.name || ""
  let homeBadge = raw.team1?.logo || ""
  let awayBadge = raw.team2?.logo || ""

  if (!homeName && !awayName) {
    const parsed = parseTeamFromTag(raw.name)
    homeName = parsed.home
    awayName = parsed.away
  }

  return {
    id: raw.stream_key || raw.id,
    title: raw.name,
    category: raw.category,
    date: raw.match_timestamp * 1000,
    popular: raw.viewers > 100,
    poster: raw.thumbnail_url || "",
    teams: {
      home: { name: homeName, badge: homeBadge },
      away: { name: awayName, badge: awayBadge },
    },
    _viewers: raw.viewers || 0,
    _embedUrl: raw.embed_url || "",
  }
}

async function fetchStreamFree(category: string): Promise<ReturnType<typeof normalizeStreamFree>[]> {
  const cacheKey = `streamfree_${category}`
  const cached = getCached<ReturnType<typeof normalizeStreamFree>[]>(cacheKey)
  if (cached) return cached

  const apiCat = CATEGORY_MAP[category]?.streamfree || category
  const res = await fetch(`${APIS.streamfree.base}/streams?category=${apiCat}`, {
    signal: AbortSignal.timeout(API_TIMEOUT),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const data = (json.streams || []).map(normalizeStreamFree)
  setCache(cacheKey, data)
  return data
}

// ESportex → normalized Match
function normalizeEsportex(raw: any): Match & { _iframes: any[] } {
  const teams = parseTeamFromTag(raw.tag)
  return {
    id: raw.slug,
    title: raw.tag,
    category: raw.league,
    date: parseKickoff(raw.kickoff),
    popular: raw.iframes?.length > 3,
    poster: raw.poster || "",
    teams: {
      home: { name: teams.home, badge: "" },
      away: { name: teams.away, badge: "" },
    },
    _iframes: raw.iframes || [],
  }
}

async function fetchEsportex(category: string): Promise<ReturnType<typeof normalizeEsportex>[]> {
  const FULL_CACHE_KEY = "esportex_full"
  let json: any = getCached<any>(FULL_CACHE_KEY)

  if (!json) {
    const res = await fetch(`${APIS.esportex.base}/streams`, {
      signal: AbortSignal.timeout(API_TIMEOUT),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    json = await res.json()
    if (!json?.success) throw new Error("API returned unsuccessful response")
    setCache(FULL_CACHE_KEY, json)
  }

  const apiCat = CATEGORY_MAP[category]?.esportex || category
  return (json[apiCat] || []).map(normalizeEsportex)
}

async function fetchMatchesWithFallback(category: string): Promise<{
  matches: Match[]
  matchMeta: Map<string, { source: string; viewers: number; embedUrl?: string; iframes?: any[] }>
}> {
  const meta = new Map<string, { source: string; viewers: number; embedUrl?: string; iframes?: any[] }>()
  const seenTitles = new Set<string>()

  const [sfRaw, esRaw] = await Promise.all([
    fetchStreamFree(category).catch(() => [] as ReturnType<typeof normalizeStreamFree>[]),
    fetchEsportex(category).catch(() => [] as ReturnType<typeof normalizeEsportex>[]),
  ])

  const allMatches: Match[] = []

  // StreamFree first — preferred source
  for (const m of sfRaw) {
    const key = m.title?.toLowerCase().trim()
    if (key) seenTitles.add(key)
    meta.set(m.id, { source: "streamfree", viewers: m._viewers, embedUrl: m._embedUrl })
    const match = { ...m }
    delete (match as any)._viewers
    delete (match as any)._embedUrl
    allMatches.push(match)
  }

  // ESportex — skip if same match already exists from StreamFree (by title)
  for (const m of esRaw) {
    const key = m.title?.toLowerCase().trim()
    if (key && seenTitles.has(key)) continue
    if (key) seenTitles.add(key)
    meta.set(m.id, { source: "esportex", viewers: 0, iframes: m._iframes })
    const match = { ...m }
    delete (match as any)._iframes
    allMatches.push(match)
  }

  return { matches: allMatches, matchMeta: meta }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = d.getTime() - now.getTime()

  if (diff < 0) return { text: "LIVE", isLive: true }
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours < 24) {
    if (hours > 0) return { text: `${hours}h ${mins}m`, isLive: false }
    return { text: `${mins}m`, isLive: false }
  }
  return {
    text: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isLive: false,
  }
}

function getInitial(name: string | null): string {
  return (name || "?").trim().charAt(0).toUpperCase()
}

function formatViewers(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}

const sportCategories: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "football", label: "Football", icon: CircleDot },
  { id: "cricket", label: "Cricket", icon: Trophy },
  { id: "basketball", label: "Basketball", icon: Volleyball },
  { id: "american-football", label: "NFL", icon: Shield },
  { id: "hockey", label: "Hockey", icon: Timer },
  { id: "baseball", label: "Baseball", icon: Target },
  { id: "motor-sports", label: "Motorsport", icon: Car },
  { id: "fight", label: "UFC / Boxing", icon: Swords },
  { id: "tennis", label: "Tennis", icon: Zap },
]

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
}
const panelExit = { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }

function SkeletonCard({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`w-full rounded-2xl border p-3 sm:p-4 ${
        isDark
          ? "border-white/[0.06] bg-white/[0.02]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`h-4 w-16 rounded-md ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
        <div className={`h-4 w-12 rounded-md ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
          <div className={`h-4 w-20 rounded ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
        </div>
        <div className={`px-2.5 py-1 rounded-lg ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
          <div className="h-3 w-6" />
        </div>
        <div className="flex items-center gap-2.5 justify-end">
          <div className={`h-4 w-20 rounded ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
          <div className={`w-9 h-9 rounded-lg shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
        </div>
      </div>
      <div className={`mt-3 h-16 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-slate-50"}`} />
    </div>
  )
}

export default function LiveSports() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [sport, setSport] = useState("football")
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [activeSource, setActiveSource] = useState<Source | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const requestIdRef = useRef(0)
  const detailRequestIdRef = useRef(0)
  const matchMetaRef = useRef<Map<string, { source: string; viewers: number; embedUrl?: string; iframes?: any[] }>>(new Map())

  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 60000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [])

  const fetchMatches = useCallback(async (category: string) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setDetail(null)
    setActiveSource(null)
    try {
      const result = await fetchMatchesWithFallback(category)
      if (requestId !== requestIdRef.current) return
      matchMetaRef.current = result.matchMeta
      setMatches(result.matches)
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : "Failed to fetch matches")
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchMatches(sport), 0)
    return () => window.clearTimeout(timeout)
  }, [sport, fetchMatches])

  const fetchDetail = useCallback(async (match: Match) => {
    const requestId = ++detailRequestIdRef.current
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    setActiveSource(null)
    try {
      const meta = matchMetaRef.current.get(match.id)
      if (!meta) throw new Error("Match metadata not found")

      let sources: Source[] = []

      if (meta.source === "streamfree") {
        if (!meta.embedUrl) throw new Error("No embed URL available")
        sources = [{
          id: match.id,
          streamNo: 1,
          language: "",
          hd: true,
          embedUrl: meta.embedUrl,
          source: "streamfree",
          viewers: meta.viewers,
        }]
      } else {
        const iframes = meta.iframes
        if (!iframes?.length) throw new Error("No stream data available")
        sources = iframes.map((iframe: any, index: number) => ({
          id: match.id,
          streamNo: index + 1,
          language: iframe.server,
          hd: iframe.server?.includes("HD") || iframe.server?.includes("FHD") || false,
          embedUrl: iframe.url,
          source: iframe.server,
          viewers: 0,
        }))
      }

      if (requestId !== detailRequestIdRef.current) return
      sources.forEach((s) => {
        if (s.embedUrl) {
          s.embedUrl = s.embedUrl.replace(/^http:\/\//i, "https://")
        }
      })
      setDetail({ ...match, sources })
      if (sources.length) setActiveSource(sources[0])
    } catch (err: unknown) {
      if (requestId !== detailRequestIdRef.current) return
      setDetailError(err instanceof Error ? err.message : "Failed to load stream")
    } finally {
      if (requestId === detailRequestIdRef.current) setDetailLoading(false)
    }
  }, [])

  const liveCount = matches.filter((m) => formatDate(m.date).isLive).length

  return (
    <div className="flex flex-col xl:h-full">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <div
            className={`p-2.5 rounded-xl ${isDark ? "bg-sport-yellow/15" : "bg-amber-50"}`}
          >
            <Trophy
              className={`w-5 h-5 ${isDark ? "text-sport-yellow" : "text-amber-600"}`}
            />
          </div>
          <div>
            <h2
              className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Live Sports
            </h2>
            <p
              className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
            >
              Match schedules &amp; live stream embeds
            </p>
          </div>
          {liveCount > 0 && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sport-red/20 text-sport-red rounded-full border border-sport-red/30"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sport-red animate-pulse" />
              {liveCount} LIVE
            </motion.span>
          )}
        </div>
      </div>

      {/* Sport Category Tabs */}
      <div className="relative mb-5 sm:mb-6 -mx-1 px-1">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide scroll-snap-x">
          {sportCategories.map(({ id, label, icon: Icon }) => {
            const isActive = sport === id
            return (
              <motion.button
                key={id}
                onClick={() => setSport(id)}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[40px] ${
                  isActive
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : isDark
                      ? "bg-white/[0.04] text-dark-100 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                      : "bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </motion.button>
            )
          })}
        </div>
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l to-transparent ${
            isDark
              ? "from-dark-500"
              : "from-[var(--surface-500,#f8fafc)]"
          }`}
        />
      </div>

      {/* Loading State — Skeleton */}
      {loading && (
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer
                className={`w-3.5 h-3.5 ${isDark ? "text-dark-100" : "text-slate-400"}`}
              />
              <div className={`h-3 w-16 rounded ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
            </div>
            <div className={`h-4 w-14 rounded-md ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} isDark={isDark} />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-sport-red/10" : "bg-red-50"}`}
            >
              <AlertTriangle className="w-7 h-7 text-sport-red" />
            </div>
            <h3
              className={`text-base font-semibold mb-1.5 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Failed to Load
            </h3>
            <p
              className={`text-sm mb-4 ${isDark ? "text-dark-100" : "text-slate-500"}`}
            >
              {error}
            </p>
            <button
              onClick={() => fetchMatches(sport)}
              className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-sm font-medium rounded-xl transition-colors duration-200 cursor-pointer"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-5 xl:flex-1 xl:min-h-0">
          {/* Match List */}
          <div
            className={`xl:w-[55%] flex flex-col min-h-0 ${
              detail || detailLoading || detailError ? "order-2" : "order-1"
            } xl:order-1`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer
                  className={`w-3.5 h-3.5 ${isDark ? "text-dark-100" : "text-slate-400"}`}
                />
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-dark-100" : "text-slate-500"}`}
                >
                  Matches
                </h3>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}
              >
                {matches.length} total
              </span>
            </div>

            <div className="max-h-[65vh] md:max-h-[70vh] xl:max-h-none xl:flex-1 overflow-y-auto space-y-2 pr-1 pb-1">
              {matches.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                  >
                    <Calendar
                      className={`w-7 h-7 ${isDark ? "text-dark-100" : "text-slate-400"}`}
                    />
                  </div>
                  <p
                    className={`text-sm font-medium mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    No matches found
                  </p>
                  <p
                    className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
                  >
                    Try a different sport category
                  </p>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={sport}
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {matches.map((match) => {
                    const isActive = detail?.id === match.id
                    const timeInfo = formatDate(match.date)
                    const meta = matchMetaRef.current.get(match.id)
                    const src = meta?.source ?? ""
                    return (
                      <motion.button
                        key={match.id}
                        variants={cardVariants}
                        onClick={() => fetchDetail(match)}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full text-left rounded-2xl border p-3 sm:p-4 transition-all duration-200 cursor-pointer group ${
                          isActive
                            ? isDark
                              ? "border-accent/40 bg-accent/[0.08] shadow-lg shadow-accent/5"
                              : "border-accent/30 bg-accent/5 shadow-md shadow-accent/5"
                            : isDark
                              ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        {/* Top Row: Status + Time */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {match.popular && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                                  isDark
                                    ? "bg-sport-green/15 text-sport-green"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                <Zap className="w-2.5 h-2.5" />
                                Featured
                              </span>
                            )}
                            {!match.popular && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md ${
                                  isDark
                                    ? "bg-white/5 text-dark-100"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                Upcoming
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {timeInfo.isLive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-sport-red/15 text-sport-red rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-sport-red animate-pulse" />
                                LIVE
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium ${isDark ? "text-dark-100" : "text-slate-500"}`}
                              >
                                <Clock className="w-3 h-3" />
                                {timeInfo.text}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Teams Row */}
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                          {/* Home Team */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {match.teams.home.badge ? (
                              <img
                                src={match.teams.home.badge}
                                alt=""
                                className={`w-9 h-9 rounded-lg object-contain shrink-0 ${isDark ? "bg-white/5" : "bg-slate-50 border border-slate-200"}`}
                                onError={(e) => {
                                  ;(
                                    e.target as HTMLImageElement
                                  ).style.display = "none"
                                }}
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                              >
                                <span
                                  className={`text-[10px] font-bold ${isDark ? "text-dark-100" : "text-slate-400"}`}
                                >
                                  {getInitial(match.teams.home.name)}
                                </span>
                              </div>
                            )}
                            <span
                              className={`text-xs sm:text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              {match.teams.home.name}
                            </span>
                          </div>

                          {/* VS */}
                          <div
                            className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                          >
                            {src && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  src === "streamfree" ? "bg-sport-green" : "bg-sport-yellow"
                                }`}
                                title={src}
                              />
                            )}
                            <span
                              className={`text-[10px] font-bold tracking-widest ${isDark ? "text-dark-100" : "text-slate-400"}`}
                            >
                              VS
                            </span>
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                            <span
                              className={`text-xs sm:text-sm font-semibold truncate text-right ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              {match.teams.away.name}
                            </span>
                            {match.teams.away.badge ? (
                              <img
                                src={match.teams.away.badge}
                                alt=""
                                className={`w-9 h-9 rounded-lg object-contain shrink-0 ${isDark ? "bg-white/5" : "bg-slate-50 border border-slate-200"}`}
                                onError={(e) => {
                                  ;(
                                    e.target as HTMLImageElement
                                  ).style.display = "none"
                                }}
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                              >
                                <span
                                  className={`text-[10px] font-bold ${isDark ? "text-dark-100" : "text-slate-400"}`}
                                >
                                  {getInitial(match.teams.away.name)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Poster */}
                        {match.poster && (
                          <div
                            className={`mt-3 rounded-xl overflow-hidden relative ${isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}
                          >
                            <img
                              src={match.poster}
                              alt=""
                              className="w-full h-20 object-cover"
                              onError={(e) => {
                                ;(
                                  e.target as HTMLImageElement
                                ).style.display = "none"
                              }}
                            />
                            <div
                              className={`absolute inset-0 ${
                                isDark
                                  ? "bg-gradient-to-t from-dark-500/80 via-transparent to-transparent"
                                  : "bg-gradient-to-t from-white/80 via-transparent to-transparent"
                              }`}
                            />
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Stream Panel */}
          <div
            className={`flex flex-col min-h-0 xl:w-[45%] ${
              detail || detailLoading || detailError ? "order-1" : "order-2"
            } xl:order-2 ${detail || detailLoading || detailError ? "xl:sticky xl:top-4" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Play
                className={`w-3.5 h-3.5 ${isDark ? "text-dark-100" : "text-slate-400"}`}
              />
              <h3
                className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-dark-100" : "text-slate-500"}`}
              >
                Stream
              </h3>
            </div>

            {/* Loading Detail */}
            {detailLoading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p
                    className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
                  >
                    Loading stream...
                  </p>
                </div>
              </div>
            )}

            {/* Detail Error */}
            {detailError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl text-center ${isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-slate-200"}`}
              >
                <AlertTriangle className="w-7 h-7 text-sport-yellow mx-auto mb-2" />
                <p
                  className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
                >
                  {detailError}
                </p>
              </motion.div>
            )}

            {/* Player */}
            <AnimatePresence mode="wait">
              {detail && !detailLoading && (
                <motion.div
                  key={detail.id}
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit={panelExit}
                  className="flex flex-col min-h-0 xl:flex-1"
                >
                  <div className="w-full h-[40vw] max-h-[280px] sm:h-[35vw] sm:max-h-[320px] md:h-[30vw] md:max-h-[360px] lg:h-[28vw] lg:max-h-[400px] xl:h-full xl:flex-1 xl:min-h-[280px] rounded-2xl overflow-hidden bg-black border border-white/[0.06]">
                    {activeSource ? (
                      <SportsPlayer
                        key={detail.id}
                        sources={detail.sources}
                        activeSource={activeSource}
                        onSourceChange={setActiveSource}
                        title={detail.title}
                        fillContainer
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-10 h-10 text-dark-100 mx-auto mb-2" />
                          <p className="text-xs text-dark-100">
                            No stream available
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stream Info + Sources */}
                  <div
                    className={`mt-3 rounded-2xl border overflow-hidden transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200"}`}
                  >
                    <div className="p-3">
                      <p
                        className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}
                      >
                        {detail.title}
                      </p>

                      {detail.sources && detail.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {detail.sources.map((s) => {
                            const isActive =
                              activeSource?.streamNo === s.streamNo &&
                              activeSource?.id === s.id
                            return (
                              <button
                                key={`${s.streamNo}-${s.language}`}
                                onClick={() => setActiveSource(s)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                                  isActive
                                    ? "bg-accent text-white shadow-md shadow-accent/20"
                                    : isDark
                                      ? "bg-white/5 text-dark-100 hover:text-white hover:bg-white/10"
                                      : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                                }`}
                              >
                                <Monitor className="w-3 h-3" />
                                {s.language || "Stream"}
                                {s.hd && (
                                  <span
                                    className={`px-1 py-0.5 text-[8px] font-bold rounded ${
                                      isActive
                                        ? "bg-white/20"
                                        : "bg-accent/20 text-accent-light"
                                    }`}
                                  >
                                    HD
                                  </span>
                                )}
                                {s.viewers > 0 && (
                                  <span className={`flex items-center gap-0.5 ${isActive ? "opacity-80" : "opacity-60"}`}>
                                    <Users className="w-2.5 h-2.5" />
                                    {formatViewers(s.viewers)}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!detail && !detailLoading && !detailError && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                  >
                    <Play
                      className={`w-6 h-6 ${isDark ? "text-dark-100" : "text-slate-400"}`}
                    />
                  </div>
                  <p
                    className={`text-sm font-medium mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    No match selected
                  </p>
                  <p
                    className={`text-xs max-w-[180px] mx-auto ${isDark ? "text-dark-100" : "text-slate-500"}`}
                  >
                    {matches.length > 0
                      ? "Select a match from the list to start streaming"
                      : "Matches will appear once data loads"}
                  </p>
                  {matches.length > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-accent/40" : "bg-accent/30"}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-accent/30" : "bg-accent/20"}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-accent/20" : "bg-accent/10"}`} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
