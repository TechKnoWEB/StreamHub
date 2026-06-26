import { useState, useMemo } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useRadioBrowser } from "../hooks/useRadioBrowser"
import { useMusic } from "../hooks/useMusic"
import TrackCard from "./TrackCard"
import { Search, Radio, Globe, Music2, Loader2, AlertCircle, PlayCircle, ChevronDown } from "lucide-react"
import { motion } from "framer-motion"
import type { Track, RadioStation } from "../types"

const GENRES = [
  { tag: "pop", label: "Pop" },
  { tag: "rock", label: "Rock" },
  { tag: "jazz", label: "Jazz" },
  { tag: "classical", label: "Classical" },
  { tag: "electronic", label: "Electronic" },
  { tag: "hiphop", label: "Hip Hop" },
  { tag: "rnb", label: "R&B" },
  { tag: "country", label: "Country" },
  { tag: "reggae", label: "Reggae" },
  { tag: "metal", label: "Metal" },
  { tag: "ambient", label: "Ambient" },
  { tag: "news", label: "News" },
]

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Japan",
  "India", "Brazil", "Canada", "Australia", "Netherlands",
]

const INITIAL_VISIBLE = 6

function stationToTrack(station: RadioStation): Track {
  return {
    id: `radio-${station.stationuuid}`,
    title: station.name,
    artist: station.tags ? station.tags.split(",").slice(0, 3).join(", ") : "Internet Radio",
    thumbnail: station.favicon || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E",
    source: "radio",
    streamUrl: station.url_resolved,
    platformUrl: station.homepage || undefined,
    codec: station.codec,
    bitrate: station.bitrate,
    country: station.country,
  }
}

export default function InternetRadio() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { stations, loading, error, searchStations, getByTag, getTopStations, getByCountry } = useRadioBrowser()
  const { playQueue } = useMusic()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [activeCountry, setActiveCountry] = useState<string | null>(null)
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [showAllCountries, setShowAllCountries] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setActiveGenre(null)
    setActiveCountry(null)
    await searchStations(searchQuery)
  }

  const handleGenreClick = async (tag: string) => {
    setActiveGenre(tag)
    setActiveCountry(null)
    setSearchQuery("")
    await getByTag(tag)
  }

  const handleCountryClick = async (country: string) => {
    setActiveCountry(country)
    setActiveGenre(null)
    setSearchQuery("")
    await getByCountry(country)
  }

  const handleLoadTop = async () => {
    setActiveGenre(null)
    setActiveCountry(null)
    setSearchQuery("")
    await getTopStations(30)
  }

  const tracks = stations.map(stationToTrack)
  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const panelClass = isDark ? "bg-dark-300/30 border-white/[0.06]" : "bg-white border-slate-200"

  return (
    <div className="space-y-5">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 45,000+ radio stations..."
          className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-colors outline-none ${
            isDark
              ? "bg-dark-300/50 border border-white/[0.06] text-white placeholder:text-dark-100 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          }`}
        />
      </form>

      {/* Quick Load Top Stations */}
      <motion.button
        onClick={handleLoadTop}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isDark
            ? "bg-accent/10 text-accent-light border border-accent/20 hover:bg-accent/20"
            : "bg-accent/5 text-accent-dark border border-accent/20 hover:bg-accent/10"
        }`}
        whileTap={{ scale: 0.97 }}
      >
        <Radio className="w-4 h-4" />
        Top Voted Stations
      </motion.button>

      {/* Filters — compact two-column on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Genre Chips */}
        <FilterSection
          icon={<Music2 className={`w-3.5 h-3.5 ${mutedText}`} />}
          label="Genres"
          isDark={isDark}
          expanded={showAllGenres}
          onToggle={() => setShowAllGenres(!showAllGenres)}
          items={GENRES.map((g) => ({
            key: g.tag,
            label: g.label,
            active: activeGenre === g.tag,
            onClick: () => handleGenreClick(g.tag),
          }))}
          visibleCount={INITIAL_VISIBLE}
          activeKey={activeGenre}
        />

        {/* Country Chips */}
        <FilterSection
          icon={<Globe className={`w-3.5 h-3.5 ${mutedText}`} />}
          label="Countries"
          isDark={isDark}
          expanded={showAllCountries}
          onToggle={() => setShowAllCountries(!showAllCountries)}
          items={COUNTRIES.map((c) => ({
            key: c,
            label: c,
            active: activeCountry === c,
            onClick: () => handleCountryClick(c),
          }))}
          visibleCount={INITIAL_VISIBLE}
          activeKey={activeCountry}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className={`ml-2 text-sm ${mutedText}`}>Loading stations...</span>
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
          <span className="text-sm text-sport-red">{error}</span>
        </motion.div>
      )}

      {/* Results */}
      {!loading && tracks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText} shrink-0`}>
              {tracks.length} stations found
            </p>
            <motion.button
              onClick={() => playQueue(tracks, 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold shadow-sm shadow-accent/20 hover:bg-accent-light transition-colors shrink-0"
              whileTap={{ scale: 0.95 }}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Play All
            </motion.button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tracks.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} queue={tracks} showMetadata />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && tracks.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center py-16 rounded-2xl border ${panelClass}`}
        >
          <Radio className={`w-12 h-12 mx-auto mb-3 ${mutedText}`} />
          <p className={`text-sm font-medium ${mutedText}`}>
            Search for a station or pick a genre to get started
          </p>
          <p className={`text-xs mt-1 ${mutedText}`}>
            Press Space to play/pause, arrows to seek
          </p>
        </motion.div>
      )}
    </div>
  )
}

interface FilterItem {
  key: string
  label: string
  active: boolean
  onClick: () => void
}

function FilterSection({
  icon,
  label,
  isDark,
  expanded,
  onToggle,
  items,
  visibleCount,
  activeKey,
}: {
  icon: React.ReactNode
  label: string
  isDark: boolean
  expanded: boolean
  onToggle: () => void
  items: FilterItem[]
  visibleCount: number
  activeKey: string | null
}) {
  const visibleItems = useMemo(() => {
    if (expanded) return items
    const shown = items.slice(0, visibleCount)
    // If active item is hidden, prepend it so user can see what's selected
    if (activeKey && !shown.find((i) => i.key === activeKey)) {
      const activeItem = items.find((i) => i.key === activeKey)
      if (activeItem) return [activeItem, ...shown]
    }
    return shown
  }, [items, expanded, visibleCount, activeKey])

  const hasMore = items.length > visibleCount

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-dark-100" : "text-slate-500"}`}>
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visibleItems.map((item) => (
          <motion.button
            key={item.key}
            onClick={item.onClick}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all min-h-[36px] ${
              item.active
                ? isDark
                  ? "bg-accent/20 text-accent-light border border-accent/30 shadow-sm shadow-accent/10"
                  : "bg-accent/10 text-accent-dark border border-accent/20 shadow-sm"
                : isDark
                  ? "bg-white/5 text-dark-100 border border-white/[0.06] hover:bg-white/10"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {item.label}
          </motion.button>
        ))}
        {hasMore && (
          <motion.button
            onClick={onToggle}
            className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all min-h-[36px] ${
              isDark
                ? "text-dark-100 hover:text-white border border-dashed border-white/10 hover:border-white/20"
                : "text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {expanded ? "Less" : `+${items.length - visibleCount}`}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </motion.button>
        )}
      </div>
    </div>
  )
}
