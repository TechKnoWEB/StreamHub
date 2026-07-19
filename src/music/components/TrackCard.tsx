import { useTheme } from "../../context/ThemeContext"
import { useMusic } from "../hooks/useMusic"
import { Play, Plus, Clock, Heart, ListPlus, Waves, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import type { Track } from "../types"

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return ""
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

interface TrackCardProps {
  track: Track
  index?: number
  queue?: Track[]
  showIndex?: boolean
  showMetadata?: boolean
}

export default function TrackCard({ track, index, queue, showIndex = false, showMetadata = false }: TrackCardProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { playTrack, addToQueue, addToQueueNext, addToPlaylist, toggleFavorite, isFavorite, state } = useMusic()
  const [showMenu, setShowMenu] = useState(false)

  const isRadio = track.source === "radio"
  const isYoutube = track.source === "youtube"
  const isFav = isFavorite(track.id)
  const sourceLabel = isRadio ? "Live Radio" : isYoutube ? "YouTube" : "Stream"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index ? Math.min(index * 0.03, 0.3) : 0 }}
      onClick={() => playTrack(track, queue)}
      className={`group relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
        isDark
          ? "bg-dark-300/40 border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 hover:shadow-lg hover:shadow-black/10"
          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative shrink-0">
        {showIndex && index !== undefined ? (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold ring-1 ring-inset ${isDark ? "bg-white/5 text-dark-100 ring-white/[0.06]" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
            {index + 1}
          </div>
        ) : (
          <div className="relative">
            <img
              src={track.thumbnail}
              alt=""
              className="w-11 h-11 rounded-xl object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
              }}
            />
            <motion.button
              onClick={() => playTrack(track, queue)}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 opacity-0 transition-opacity md:group-hover:opacity-100"
              whileTap={{ scale: 0.92 }}
            >
              <Play className="w-4 h-4 text-white ml-0.5" />
            </motion.button>
          </div>
        )}
        {!showIndex && isRadio && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-sport-green/20 border border-sport-green/30 flex items-center justify-center">
            <Waves className="w-2.5 h-2.5 text-sport-green" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-dark-100" : "text-slate-500"}`}>
            {sourceLabel}
          </span>
          {isRadio ? (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sport-green/15 text-sport-green border border-sport-green/20">
              LIVE
            </span>
          ) : null}
        </div>
        <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
          {track.title}
        </p>
        <p className={`text-xs truncate mt-0.5 ${isDark ? "text-dark-100" : "text-slate-500"}`}>
          {track.artist}
        </p>
        {showMetadata && isRadio && (track.codec || track.bitrate || track.country || track.language) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {track.country && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
                {getCountryFlag(track.country.slice(0, 2))} {track.country}
              </span>
            )}
            {track.language && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
                {track.language}
              </span>
            )}
            {track.codec && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
                {track.codec}
              </span>
            )}
            {track.bitrate && track.bitrate > 0 && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
                {track.bitrate} kbps
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {track.duration && (
          <span className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
            <Clock className="w-3 h-3" />
            {track.duration}
          </span>
        )}

        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(track)
          }}
          className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${isFav ? "text-sport-red opacity-100" : isDark ? "text-dark-100 md:opacity-0 md:group-hover:opacity-100 hover:text-sport-red" : "text-slate-400 md:opacity-0 md:group-hover:opacity-100 hover:text-sport-red"}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            addToQueue(track)
          }}
          className={`flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg transition-all ${isDark ? "text-dark-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10" : "text-slate-400 md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-100"}`}
        >
          <Plus className="w-4 h-4" />
        </motion.button>

        <div className="relative">
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${isDark ? "text-dark-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10" : "text-slate-400 md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-100"}`}
          >
            <ListPlus className="w-4 h-4" />
          </motion.button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className={`absolute right-0 top-full mt-1 z-50 w-48 max-w-[calc(100vw-32px)] rounded-xl border shadow-xl py-1 ${
                isDark ? "bg-dark-200 border-white/[0.06]" : "bg-white border-slate-200"
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addToQueueNext(track)
                    setShowMenu(false)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-3 text-xs font-medium ${isDark ? "text-white hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Play Next
                </button>
                {track.platformUrl && (
                  <a
                    href={track.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center gap-2 px-3 py-3 text-xs font-medium ${isDark ? "text-white hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"}`}
                    onClick={() => setShowMenu(false)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit Website
                  </a>
                )}
                {state.playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      addToPlaylist(pl.id, track)
                      setShowMenu(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-3 text-xs font-medium ${isDark ? "text-white hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    Add to {pl.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
