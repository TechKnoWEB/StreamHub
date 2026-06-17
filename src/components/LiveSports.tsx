import { useState, useEffect, useCallback } from "react"
import {
  Trophy,
  Loader2,
  Calendar,
  Play,
  Clock,
  AlertTriangle,
  Monitor,
  Zap,
  CircleDot,
  Volleyball,
  Target,
  Swords,
  Car,
  Timer,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useLiveStream } from "../context/LiveStreamContext"
import type { Match } from "../types"

const API_BASE = "https://api.sportsrc.org"

interface Source {
  id: string
  streamNo: number
  language: string
  hd: boolean
  embedUrl: string
  source: string
  viewers: number
}

interface MatchDetail {
  id: string
  title: string
  category: string
  date: number
  popular: boolean
  poster: string
  teams: {
    home: { name: string; badge: string }
    away: { name: string; badge: string }
  }
  sources: Source[]
}

const sportCategories: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "football", label: "Football", icon: CircleDot },
  { id: "cricket", label: "Cricket", icon: Volleyball },
  { id: "basketball", label: "Basketball", icon: Volleyball },
  { id: "american-football", label: "NFL", icon: Volleyball },
  { id: "hockey", label: "Hockey", icon: Target },
  { id: "baseball", label: "Baseball", icon: CircleDot },
  { id: "motor-sports", label: "Motorsport", icon: Car },
  { id: "fight", label: "UFC / Boxing", icon: Swords },
  { id: "tennis", label: "Tennis", icon: Target },
]

function getDirectPlayerUrl(source: Source): string {
  return `https://embed.st/embed/${source.source}/${source.id}/${source.streamNo}`
}

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

export default function LiveSports() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { setLiveMatch } = useLiveStream()
  const [sport, setSport] = useState("football")
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [activeSource, setActiveSource] = useState<Source | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchMatches = useCallback(async (category: string) => {
    setLoading(true)
    setError(null)
    setDetail(null)
    setActiveSource(null)
    try {
      const res = await fetch(
        `${API_BASE}/?data=matches&category=${category}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.success) {
        setMatches(json.data || [])
      } else {
        throw new Error("API returned unsuccessful response")
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch matches"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchMatches(sport)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [sport, fetchMatches])

  // Push latest live football match to Streams section
  useEffect(() => {
    if (sport !== "football" || matches.length === 0) return

    let cancelled = false

    async function pushLiveMatch() {
      const target = matches[0]
      try {
        const res = await fetch(
          `${API_BASE}/?data=detail&category=${target.category}&id=${target.id}`,
          { signal: AbortSignal.timeout(10000) }
        )
        if (!res.ok) return
        const json = await res.json()
        if (cancelled || !json.success || !json.data) return

        const d = json.data as MatchDetail
        if (!d.sources?.length) return

        const bestSource = d.sources.find((s) => s.hd) || d.sources[0]
        setLiveMatch({
          id: d.id,
          title: d.title,
          category: d.category,
          embedUrl: getDirectPlayerUrl(bestSource),
          teams: d.teams,
          source: bestSource.source,
          viewers: bestSource.viewers,
        })
      } catch {
        // Silently fail — Streams section stays unchanged
      }
    }

    void pushLiveMatch()
    return () => { cancelled = true }
  }, [sport, matches, setLiveMatch])

  const fetchDetail = async (match: Match) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    setActiveSource(null)
    try {
      const res = await fetch(
        `${API_BASE}/?data=detail&category=${match.category}&id=${match.id}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.success && json.data) {
        const d = json.data as MatchDetail
        setDetail(d)
        if (d.sources?.length) setActiveSource(d.sources[0])
      } else {
        throw new Error("No stream data available")
      }
    } catch (err: unknown) {
      setDetailError(
        err instanceof Error ? err.message : "Failed to load stream"
      )
    } finally {
      setDetailLoading(false)
    }
  }

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
          
        </div>
      </div>

      {/* Sport Category Tabs */}
      <div className="flex gap-1.5 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide scroll-snap-x -mx-1 px-1">
        {sportCategories.map(({ id, label, icon: Icon }) => {
          const isActive = sport === id
          return (
            <button
              key={id}
              onClick={() => setSport(id)}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[40px] ${
                isActive
                  ? isDark
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "bg-accent text-white shadow-md shadow-accent/20"
                  : isDark
                    ? "bg-white/[0.04] text-dark-100 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                    : "bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-4">
              <Loader2 className="w-10 h-10 text-accent-light animate-spin mx-auto" />
            </div>
            <p
              className={`text-sm font-medium mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Loading matches
            </p>
            <p
              className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
            >
              Fetching {sport} schedules...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
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
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 xl:flex-1 xl:min-h-0">
          {/* Match List */}
          <div
            className={`xl:col-span-2 flex flex-col min-h-0 ${
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

            <div className="max-h-[58vh] xl:max-h-none xl:flex-1 overflow-y-auto space-y-2 pr-1 pb-1">
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

              {matches.map((match) => {
                const isActive = detail?.id === match.id
                const timeInfo = formatDate(match.date)
                return (
                  <button
                    key={match.id}
                    onClick={() => fetchDetail(match)}
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
                              ?
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
                        className={`px-2.5 py-1 rounded-lg shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                      >
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
                              ?
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Poster */}
                    {match.poster && (
                      <div
                        className={`mt-3 rounded-xl overflow-hidden ${isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}
                      >
                        <img
                          src={match.poster}
                          alt=""
                          className="w-full h-16 object-cover opacity-40"
                          onError={(e) => {
                            ;(
                              e.target as HTMLImageElement
                            ).style.display = "none"
                          }}
                        />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stream Panel */}
          <div
            className={`flex flex-col min-h-0 ${
              detail || detailLoading || detailError ? "order-1" : "order-2"
            } xl:order-2`}
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
                  <Loader2 className="w-8 h-8 text-accent-light animate-spin mx-auto mb-3" />
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
              <div
                className={`p-4 rounded-2xl text-center ${isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-slate-200"}`}
              >
                <AlertTriangle className="w-7 h-7 text-sport-yellow mx-auto mb-2" />
                <p
                  className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
                >
                  {detailError}
                </p>
              </div>
            )}

            {/* Player */}
            {detail && !detailLoading && (
              <div className="flex flex-col min-h-0 xl:flex-1">
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/[0.06] xl:aspect-auto xl:flex-1 xl:min-h-0">
                  {activeSource ? (
                    <iframe
                      src={getDirectPlayerUrl(activeSource)}
                      className="w-full h-full border-0"
                      title={detail.title}
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
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
                              {s.language}
                              {s.hd && (
                                <span className="px-1 py-0.5 text-[8px] font-bold bg-white/10 rounded">
                                  HD
                                </span>
                              )}
                              <span className="opacity-50">
                                {s.viewers}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                    className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}
                  >
                    Click a match to start streaming
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
