import { useState } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useYouTubeSearch } from "../hooks/useYouTubeSearch"
import { useMusic } from "../hooks/useMusic"
import TrackCard from "./TrackCard"
import { Search, Loader2, AlertCircle, MonitorPlay, PlayCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function YouTubeSearch() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { results, loading, error, search } = useYouTubeSearch()
  const { playQueue } = useMusic()
  const [query, setQuery] = useState("")

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    await search(query)
  }

  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const panelClass = isDark ? "bg-dark-300/30 border-white/[0.06]" : "bg-white border-slate-200"

  const quickSearches = [
    "Trending Music 2026",
    "Lo-fi Beats",
    "Jazz Classics",
    "EDM Mix",
    "Bollywood Hits",
    "Rock Anthems",
    "Chill Vibes",
    "Workout Playlist",
  ]

  return (
    <div className="space-y-5">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search YouTube Music..."
          className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${
            isDark
              ? "bg-dark-300/50 border border-white/[0.06] text-white placeholder:text-dark-100 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          }`}
        />
      </form>

      {/* Quick Searches */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedText}`}>Quick Search</p>
        <div className="flex flex-wrap gap-2">
          {quickSearches.map((q) => (
            <motion.button
              key={q}
              onClick={async () => {
                setQuery(q)
                await search(q)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isDark
                  ? "bg-white/5 text-dark-100 border border-white/[0.06] hover:bg-white/10"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {q}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className={`ml-2 text-sm ${mutedText}`}>Searching...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 rounded-xl bg-sport-red/10 border border-sport-red/20"
        >
          <AlertCircle className="w-4 h-4 text-sport-red" />
          <span className="text-sm text-sport-red min-w-0 break-words">{error}</span>
        </motion.div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
              {results.length} results found
            </p>
            <motion.button
              onClick={() => playQueue(results, 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold shadow-sm shadow-accent/20 hover:bg-accent-light transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Play All
            </motion.button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} queue={results} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center py-16 rounded-2xl border ${panelClass}`}
        >
          <MonitorPlay className={`w-12 h-12 mx-auto mb-3 ${mutedText}`} />
          <p className={`text-sm font-medium ${mutedText}`}>
            Search for your favorite music or pick a quick search above
          </p>
          <p className={`text-xs mt-1 ${mutedText}`}>
            Press Space to play/pause, arrows to seek
          </p>
        </motion.div>
      )}
    </div>
  )
}
