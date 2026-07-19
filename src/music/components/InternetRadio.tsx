import { useState, useMemo, useEffect } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useRadioBrowser } from "../hooks/useRadioBrowser"
import { useMusic } from "../hooks/useMusic"
import TrackCard from "./TrackCard"
import {
  Search, Radio, Globe, Music2, Loader2, AlertCircle, PlayCircle,
  ChevronDown, Languages, RefreshCw, SlidersHorizontal, X
} from "lucide-react"
import { motion } from "framer-motion"
import type { Track, RadioStation } from "../types"

const RADIO_API_BASE = "https://de1.api.radio-browser.info"

function stationToTrack(station: RadioStation): Track {
  return {
    id: `radio-${station.stationuuid}`,
    title: station.name,
    artist: station.tags ? station.tags.split(",").slice(0, 3).join(", ") : "Internet Radio",
    thumbnail:
      station.favicon ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E",
    source: "radio",
    streamUrl: station.url_resolved,
    platformUrl: station.homepage || undefined,
    codec: station.codec,
    bitrate: station.bitrate,
    country: station.country,
    language: station.language,
  }
}

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return ""
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

export default function InternetRadio() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { stations, loading, error, hasMore, searchStations, getByTag, getTopStations, getByCountry, getByLanguage, loadMore, retry } = useRadioBrowser()
  const { playQueue } = useMusic()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [activeCountry, setActiveCountry] = useState<string | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [genres, setGenres] = useState<{ tag: string; label: string; count: number }[]>([])
  const [countries, setCountries] = useState<{ code: string; name: string; count: number }[]>([])
  const [languages, setLanguages] = useState<{ name: string; count: number }[]>([])

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [tagsRes, countriesRes, languagesRes] = await Promise.all([
          fetch(`${RADIO_API_BASE}/json/tags?limit=30&order=stationcount&reverse=true`),
          fetch(`${RADIO_API_BASE}/json/countries?limit=30&order=stationcount&reverse=true`),
          fetch(`${RADIO_API_BASE}/json/languages?limit=20&order=stationcount&reverse=true`),
        ])
        if (tagsRes.ok) {
          const tags: { name: string; stationcount: number }[] = await tagsRes.json()
          setGenres(tags.filter((t) => t.name).map((t) => ({ tag: t.name, label: t.name.charAt(0).toUpperCase() + t.name.slice(1), count: t.stationcount })))
        }
        if (countriesRes.ok) {
          const countries: { name: string; code: string; stationcount: number }[] = await countriesRes.json()
          setCountries(countries.filter((c) => c.name).map((c) => ({ code: c.code, name: c.name, count: c.stationcount })))
        }
        if (languagesRes.ok) {
          const langs: { name: string; stationcount: number }[] = await languagesRes.json()
          setLanguages(langs.filter((l) => l.name).map((l) => ({ name: l.name.charAt(0).toUpperCase() + l.name.slice(1), count: l.stationcount })))
        }
      } catch {
      }
    }
    fetchMeta()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setActiveGenre(null)
    setActiveCountry(null)
    setActiveLanguage(null)
    await searchStations(searchQuery)
  }

  const handleGenreClick = async (tag: string) => {
    setActiveGenre(tag)
    setActiveCountry(null)
    setActiveLanguage(null)
    setSearchQuery("")
    await getByTag(tag)
  }

  const handleCountryClick = async (country: string) => {
    setActiveCountry(country)
    setActiveGenre(null)
    setActiveLanguage(null)
    setSearchQuery("")
    await getByCountry(country)
  }

  const handleLanguageClick = async (language: string) => {
    setActiveLanguage(language)
    setActiveGenre(null)
    setActiveCountry(null)
    setSearchQuery("")
    await getByLanguage(language)
  }

  const handleLoadTop = async () => {
    setActiveGenre(null)
    setActiveCountry(null)
    setActiveLanguage(null)
    setSearchQuery("")
    await getTopStations(30)
  }

  const tracks = stations.map(stationToTrack)
  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const panelClass = isDark ? "bg-dark-300/30 border-white/[0.06]" : "bg-white border-slate-200"
  const hasActiveFilters = activeGenre || activeCountry || activeLanguage

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <form onSubmit={handleSearch}>
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
        </div>
        <button
          onClick={() => setFilterPanelOpen(true)}
          className={`p-3 rounded-xl transition-all shrink-0 ${
            filterPanelOpen || hasActiveFilters
              ? "bg-accent text-white shadow-sm shadow-accent/20"
              : isDark
                ? "bg-dark-300/50 border border-dark-400/50 text-dark-100 hover:text-white hover:border-accent/50"
                : "bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-accent/50"
          }`}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className={`ml-2 text-sm ${mutedText}`}>Loading stations...</span>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-sport-red/10 border border-sport-red/20"
        >
          <AlertCircle className="w-4 h-4 text-sport-red shrink-0" />
          <span className="text-sm text-sport-red flex-1">{error}</span>
          <motion.button
            onClick={retry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sport-red/20 text-sport-red text-xs font-semibold hover:bg-sport-red/30 transition-colors shrink-0"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </motion.button>
        </motion.div>
      )}

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
          {hasMore && !loading && (
            <div className="flex justify-center pt-2">
              <motion.button
                onClick={loadMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors border border-dashed"
                whileTap={{ scale: 0.97 }}
              >
                <ChevronDown className="w-4 h-4" />
                Load More
              </motion.button>
            </div>
          )}
        </div>
      )}

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
        </motion.div>
      )}

      {/* Filter Panel Overlay */}
      <div className={`fixed inset-0 z-50 flex items-start justify-end transition-all duration-300 ${
        filterPanelOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
      }`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setFilterPanelOpen(false)} />
        <div className={`relative w-full max-w-sm h-full overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${
          filterPanelOpen ? "translate-x-0" : "translate-x-full"
        } ${isDark ? "bg-dark-300/95 backdrop-blur-xl border-l border-white/5" : "bg-white/95 backdrop-blur-xl border-l border-slate-200"}`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-accent-light" />
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                Filters
              </span>
            </div>
            <button
              onClick={() => setFilterPanelOpen(false)}
              className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-dark-100 hover:text-white" : "hover:bg-slate-100 text-slate-500"}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <RadioFilterPanel
              isDark={isDark}
              genres={genres}
              countries={countries}
              languages={languages}
              activeGenre={activeGenre}
              activeCountry={activeCountry}
              activeLanguage={activeLanguage}
              onSelectGenre={handleGenreClick}
              onSelectCountry={handleCountryClick}
              onSelectLanguage={handleLanguageClick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Radio Filter Panel ────────────────────────────── */

interface RadioFilterPanelProps {
  isDark: boolean
  genres: { tag: string; label: string; count: number }[]
  countries: { code: string; name: string; count: number }[]
  languages: { name: string; count: number }[]
  activeGenre: string | null
  activeCountry: string | null
  activeLanguage: string | null
  onSelectGenre: (tag: string) => void
  onSelectCountry: (country: string) => void
  onSelectLanguage: (language: string) => void
}

function RadioFilterPanel({
  isDark,
  genres,
  countries,
  languages,
  activeGenre,
  activeCountry,
  activeLanguage,
  onSelectGenre,
  onSelectCountry,
  onSelectLanguage,
}: RadioFilterPanelProps) {
  const [openSection, setOpenSection] = useState<"genre" | "country" | "language" | null>("genre")
  const [countrySearch, setCountrySearch] = useState("")

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries
    const q = countrySearch.toLowerCase()
    return countries.filter((c) => c.name.toLowerCase().includes(q))
  }, [countries, countrySearch])

  const toggle = (section: "genre" | "country" | "language") => {
    setOpenSection((prev) => (prev === section ? null : section))
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200"}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? "border-white/5" : "border-slate-100"}`}>
        <SlidersHorizontal className="w-3.5 h-3.5 text-accent-light" />
        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-dark-100" : "text-slate-500"}`}>
          Filters
        </span>
        <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-md ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
          {genres.length + countries.length + languages.length}
        </span>
      </div>

      {/* Genre Section */}
      <div className={`border-b ${isDark ? "border-white/5" : "border-slate-100"}`}>
        <button
          onClick={() => toggle("genre")}
          className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2">
            <Music2 className="w-3 h-3 text-accent-light" />
            <span className={`text-xs font-medium ${isDark ? "text-white" : "text-slate-700"}`}>Genre</span>
            {activeGenre && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-accent text-white rounded-full">1</span>
            )}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSection === "genre" ? "rotate-180" : ""} ${isDark ? "text-dark-100" : "text-slate-400"}`} />
        </button>
        {openSection === "genre" && (
          <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
              {genres.map((g) => (
                <PillButton
                  key={g.tag}
                  label={g.label}
                  count={g.count}
                  active={activeGenre === g.tag}
                  onClick={() => onSelectGenre(g.tag)}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Country Section */}
      <div className={`border-b ${isDark ? "border-white/5" : "border-slate-100"}`}>
        <button
          onClick={() => toggle("country")}
          className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-accent-light" />
            <span className={`text-xs font-medium ${isDark ? "text-white" : "text-slate-700"}`}>Country</span>
            {activeCountry && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-accent text-white rounded-full">1</span>
            )}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSection === "country" ? "rotate-180" : ""} ${isDark ? "text-dark-100" : "text-slate-400"}`} />
        </button>
        {openSection === "country" && (
          <div className="px-3 pb-3">
            {countries.length > 15 && (
              <div className="relative mb-2">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ${isDark ? "text-dark-100" : "text-slate-400"}`} />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className={`w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all ${
                    isDark
                      ? "bg-white/[0.04] border border-white/[0.06] text-white placeholder-dark-100"
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
              {filteredCountries.map((c) => (
                <PillButton
                  key={c.name}
                  label={c.code ? `${getCountryFlag(c.code)} ${c.name}` : c.name}
                  count={c.count}
                  active={activeCountry === c.name}
                  onClick={() => onSelectCountry(c.name)}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Language Section */}
      <div>
        <button
          onClick={() => toggle("language")}
          className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2">
            <Languages className="w-3 h-3 text-accent-light" />
            <span className={`text-xs font-medium ${isDark ? "text-white" : "text-slate-700"}`}>Language</span>
            {activeLanguage && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-accent text-white rounded-full">1</span>
            )}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSection === "language" ? "rotate-180" : ""} ${isDark ? "text-dark-100" : "text-slate-400"}`} />
        </button>
        {openSection === "language" && (
          <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
              {languages.map((l) => (
                <PillButton
                  key={l.name}
                  label={l.name}
                  count={l.count}
                  active={activeLanguage === l.name}
                  onClick={() => onSelectLanguage(l.name)}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Pill Button ────────────────────────────────────── */

function PillButton({
  label,
  count,
  active,
  onClick,
  isDark,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  isDark: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-all duration-150 cursor-pointer min-h-[26px] ${
        active
          ? "bg-accent text-white shadow-sm shadow-accent/20"
          : isDark
            ? "bg-white/[0.04] text-dark-100 hover:text-white hover:bg-white/[0.08]"
            : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
      }`}
    >
      {label}
      <span className="opacity-50">{count}</span>
    </button>
  )
}
