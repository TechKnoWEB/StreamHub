import { useTheme } from "../../context/ThemeContext"
import { useMusic } from "../hooks/useMusic"
import { Play, Plus, Clock, Heart, ListPlus } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import type { Track } from "../types"

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
  const isFav = isFavorite(track.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index ? Math.min(index * 0.03, 0.3) : 0 }}
      className={`group relative flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isDark
          ? "bg-dark-300/30 border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
          : "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
      }`}
    >
      {/* Index / Thumbnail */}
      <div className="relative shrink-0">
        {showIndex && index !== undefined ? (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
            {index + 1}
          </div>
        ) : (
          <img
            src={track.thumbnail}
            alt=""
            className="w-10 h-10 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
            }}
          />
        )}
        {/* Play overlay — always visible on mobile */}
        <motion.button
          onClick={() => playTrack(track, queue)}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          whileTap={{ scale: 0.9 }}
        >
          <Play className="w-4 h-4 text-white ml-0.5" />
        </motion.button>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-slate-900"}`}>
          {track.title}
        </p>
        <p className={`text-xs truncate ${isDark ? "text-dark-100" : "text-slate-500"}`}>
          {track.artist}
        </p>
        {showMetadata && isRadio && (track.codec || track.bitrate) && (
          <div className="flex items-center gap-2 mt-0.5">
            {track.codec && (
              <span className={`text-[9px] font-medium ${isDark ? "text-dark-100" : "text-slate-400"}`}>
                {track.codec}
              </span>
            )}
            {track.bitrate && track.bitrate > 0 && (
              <span className={`text-[9px] font-medium ${isDark ? "text-dark-100" : "text-slate-400"}`}>
                {track.bitrate}kbps
              </span>
            )}
          </div>
        )}
      </div>

      {/* Meta & Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {track.duration && (
          <span className={`hidden sm:flex items-center gap-1 text-[10px] ${isDark ? "text-dark-100" : "text-slate-400"}`}>
            <Clock className="w-3 h-3" />
            {track.duration}
          </span>
        )}
        {isRadio && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sport-green/20 text-sport-green">
            LIVE
          </span>
        )}

        {/* Favorite button — always visible on mobile */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(track.id)
          }}
          className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${isFav ? "text-sport-red opacity-100" : isDark ? "text-dark-100 md:opacity-0 md:group-hover:opacity-100 hover:text-sport-red" : "text-slate-400 md:opacity-0 md:group-hover:opacity-100 hover:text-sport-red"}`}
          whileTap={{ scale: 0.85 }}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
        </motion.button>

        {/* Add to queue — always visible on mobile, hover on desktop */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            addToQueue(track)
          }}
          className={`flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg transition-all ${isDark ? "text-dark-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10" : "text-slate-400 md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-100"}`}
          whileTap={{ scale: 0.9 }}
          title="Add to queue"
        >
          <Plus className="w-4 h-4" />
        </motion.button>

        {/* More menu — always visible on mobile */}
        <div className="relative">
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${isDark ? "text-dark-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10" : "text-slate-400 md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-100"}`}
            whileTap={{ scale: 0.9 }}
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
