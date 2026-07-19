import { useTheme } from "../../context/ThemeContext"
import { useMusic } from "../hooks/useMusic"
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Repeat1, Shuffle, X, ListMusic, Heart, ChevronUp, Tv } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import YouTubeEmbed from "./YouTubeEmbed"
import type { Track } from "../types"

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function AudioVisualizer() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-accent rounded-full"
          animate={{ height: ["4px", "14px", "6px", "12px", "4px"] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

function QueueRow({
  track,
  active,
  isDark,
  onSelect,
  onRemove,
  compact = false,
}: {
  track: Track
  active: boolean
  isDark: boolean
  onSelect: () => void
  onRemove: () => void
  compact?: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`w-full flex items-center gap-3 p-2 ${compact ? "rounded-lg" : "rounded-xl"} text-left transition-colors cursor-pointer ${
        active ? (isDark ? "bg-accent/20" : "bg-accent/10") : isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
      }`}
    >
      <img
        src={track.thumbnail}
        alt=""
        className={`shrink-0 object-cover ${compact ? "w-8 h-8 rounded-md" : "w-10 h-10 rounded-lg"}`}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
        }}
      />
      <div className="min-w-0 flex-1">
        <p className={`font-medium truncate ${compact ? "text-xs" : "text-sm"} ${active ? (isDark ? "text-accent-light" : "text-accent-dark") : isDark ? "text-white" : "text-slate-900"}`}>
          {track.title}
        </p>
        <p className={`truncate text-[10px] ${isDark ? "text-dark-100" : "text-slate-500"}`}>
          {track.artist}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-400"}`}
        aria-label="Remove from queue"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function MusicPlayer() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const {
    state,
    dispatch,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleFavorite,
    isFavorite,
    registerYouTubeControls,
    unregisterYouTubeControls,
  } = useMusic()
  const [showQueue, setShowQueue] = useState(false)
  const [showMobileControls, setShowMobileControls] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const { currentTrack, isPlaying, progress, duration, volume, isMuted, isShuffled, repeatMode, queue, queueIndex } = state

  if (!currentTrack) return null

  const isYoutube = currentTrack.source === "youtube"
  const isFav = isFavorite(currentTrack.id)

  const panelClass = isDark
    ? "bg-dark-300/95 backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-10px_40px_rgba(0,0,0,0.18)]"
    : "bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(15,23,42,0.08)]"

  const renderQueueRows = (compact = false) =>
    queue.map((track, i) => (
      <QueueRow
        key={`${track.id}-${i}`}
        track={track}
        active={i === queueIndex}
        isDark={isDark}
        compact={compact}
        onSelect={() => dispatch({ type: "SET_QUEUE_INDEX", index: i })}
        onRemove={() => dispatch({ type: "REMOVE_FROM_QUEUE", index: i })}
      />
    ))

  return (
    <>
      {isYoutube && (
        <YouTubeEmbed
          videoId={currentTrack.streamUrl}
          visible={showVideo}
          onClose={() => setShowVideo(false)}
          onControlsReady={registerYouTubeControls}
          onControlsCleanup={unregisterYouTubeControls}
        />
      )}

      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-24 left-0 right-0 lg:bottom-24 lg:left-auto lg:right-4 lg:w-96 z-50 max-h-[50vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl border-t lg:border ${
              isDark ? "bg-dark-200/95 backdrop-blur-xl border-white/[0.06]" : "bg-white/95 backdrop-blur-xl border-slate-200"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ListMusic className={`w-4 h-4 ${isDark ? "text-dark-100" : "text-slate-500"}`} />
                  <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Queue ({queue.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => dispatch({ type: "CLEAR_QUEUE" })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${isDark ? "text-dark-100 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowQueue(false)}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-500"}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {renderQueueRows()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileControls && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed inset-x-0 bottom-0 z-50 h-[92dvh] lg:hidden rounded-t-[2.5rem] border-t shadow-2xl flex flex-col overflow-hidden ${
              isDark ? "bg-dark-200/95 backdrop-blur-xl border-white/[0.06]" : "bg-white/95 backdrop-blur-xl border-slate-200"
            }`}
          >
            <div className="py-4 flex items-center justify-center shrink-0">
              <button
                onClick={() => {
                  setShowMobileControls(false)
                  setShowQueue(false)
                }}
                className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/10 hover:bg-slate-400 dark:hover:bg-white/20 transition-colors"
                aria-label="Close player"
              />
            </div>

            <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto">
              {showQueue ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Queue ({queue.length})
                    </h3>
                    <button
                      onClick={() => setShowQueue(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}
                    >
                      Back to Song
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {renderQueueRows(true)}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-around py-4">
                  <div className="relative aspect-square w-64 max-w-full mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-black/40 shrink-0">
                    <img
                      src={currentTrack.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                          Now Playing
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
                          {currentTrack.source === "youtube" ? "YouTube Music" : "Internet Radio"}
                        </span>
                      </div>
                      <h2 className={`text-xl font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                        {currentTrack.title}
                      </h2>
                      <p className={`text-sm truncate mt-1 ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                        {currentTrack.artist}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => toggleFavorite(currentTrack)}
                      className={`p-2.5 rounded-full transition-colors shrink-0 ${isFav ? "text-sport-red bg-sport-red/10" : isDark ? "bg-white/5 text-dark-100 hover:text-white" : "bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Heart className={`w-5 h-5 ${isFav ? "fill-current" : ""}`} />
                    </motion.button>
                  </div>

                  <div className="mt-6 space-y-2">
                    <div
                      className="relative w-full h-2 cursor-pointer rounded-full bg-slate-200 dark:bg-white/10"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        seek((x / rect.width) * duration)
                      }}
                    >
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-purple-500 rounded-full" style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }} />
                      <div className="absolute -top-1 w-4 h-4 bg-white rounded-full shadow-md" style={{ left: `calc(${duration > 0 ? (progress / duration) * 100 : 0}% - 8px)` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 dark:text-dark-100 tabular-nums">
                      <span>{formatTime(progress)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-6">
                    <motion.button
                      onClick={() => dispatch({ type: "TOGGLE_SHUFFLE" })}
                      className={`p-2.5 rounded-full transition-colors ${isShuffled ? "text-accent bg-accent/10" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Shuffle className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                      onClick={prevTrack}
                      className={`p-3 rounded-full transition-colors ${isDark ? "bg-white/5 text-white hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SkipBack className="w-6 h-6" />
                    </motion.button>

                    <motion.button
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white shadow-xl shadow-accent/20 shrink-0"
                      whileTap={{ scale: 0.95 }}
                    >
                      {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </motion.button>

                    <motion.button
                      onClick={nextTrack}
                      className={`p-3 rounded-full transition-colors ${isDark ? "bg-white/5 text-white hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SkipForward className="w-6 h-6" />
                    </motion.button>

                    <motion.button
                      onClick={() => dispatch({ type: "CYCLE_REPEAT" })}
                      className={`p-2.5 rounded-full transition-colors ${repeatMode !== "none" ? "text-accent bg-accent/10" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-4 mt-6">
                    <button onClick={toggleMute} className={`p-2 rounded-full ${isDark ? "text-dark-100" : "text-slate-400"}`}>
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 accent-accent cursor-pointer rounded-lg bg-slate-200 dark:bg-white/10"
                    />

                    <button
                      onClick={() => setShowQueue(true)}
                      className={`p-2.5 rounded-full ${isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                    >
                      <ListMusic className="w-5 h-5" />
                    </button>

                    {isYoutube && (
                      <button
                        onClick={() => setShowVideo(!showVideo)}
                        className={`p-2.5 rounded-full ${showVideo ? "text-accent bg-accent/10" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                      >
                        <Tv className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`fixed left-0 right-0 z-30 safe-area-bottom bottom-[72px] lg:bottom-0 ${panelClass}`}
      >
        <div
          className="relative w-full cursor-pointer group py-2 hidden md:block"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            seek((x / rect.width) * duration)
          }}
        >
          <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 ${isDark ? "bg-white/10" : "bg-slate-200"} rounded-full`} />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-to-r from-accent to-purple-500 rounded-full"
            style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-accent/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${duration > 0 ? (progress / duration) * 100 : 0}% - 6px)` }}
          />
        </div>

        <div
          className="relative w-full md:hidden cursor-pointer py-1.5"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            seek((x / rect.width) * duration)
          }}
        >
          <div className={`absolute bottom-1.5 left-0 right-0 h-[2px] rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
          <div
            className="absolute bottom-1.5 left-0 h-[2px] bg-gradient-to-r from-accent to-purple-500 rounded-full"
            style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute bottom-0 w-3 h-3 bg-white rounded-full shadow-md -translate-x-1/2"
            style={{ left: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
          <div
            className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 cursor-pointer md:cursor-auto"
            onClick={() => setShowMobileControls(true)}
          >
            <div className="relative shrink-0">
              <img
                src={currentTrack.thumbnail}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
                }}
              />
              {isPlaying && currentTrack.source === "radio" && (
                <div className="absolute -bottom-1 -right-1">
                  <AudioVisualizer />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                  Now Playing
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold ${isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"}`}>
                  {currentTrack.source === "youtube" ? "YT Music" : "Radio"}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {currentTrack.title}
              </p>
              <p className={`text-[10px] sm:text-xs truncate ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                {currentTrack.artist}
              </p>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-1 shrink-0">
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
              className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white shadow-md shadow-accent/20 shrink-0"
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </motion.button>
            <button
              onClick={() => setShowMobileControls(true)}
              className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${isDark ? "text-dark-100" : "text-slate-400"}`}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-0.5 sm:gap-1 shrink-0">
            <motion.button
              onClick={() => toggleFavorite(currentTrack)}
              className={`hidden sm:flex p-2 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg transition-colors ${isFav ? "text-sport-red" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
              whileTap={{ scale: 0.85 }}
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
            </motion.button>

            <motion.button
              onClick={prevTrack}
              className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${isDark ? "text-dark-100 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
              whileTap={{ scale: 0.9 }}
            >
              <SkipBack className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/30 shrink-0"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </motion.button>

            <motion.button
              onClick={nextTrack}
              className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${isDark ? "text-dark-100 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
              whileTap={{ scale: 0.9 }}
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => dispatch({ type: "TOGGLE_SHUFFLE" })}
              className={`hidden sm:flex p-2 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg transition-colors ${isShuffled ? "text-accent-light" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
              whileTap={{ scale: 0.9 }}
            >
              <Shuffle className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={() => dispatch({ type: "CYCLE_REPEAT" })}
              className={`hidden sm:flex p-2 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg transition-colors ${repeatMode !== "none" ? "text-accent-light" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
              whileTap={{ scale: 0.9 }}
            >
              {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </motion.button>

            {isYoutube && (
              <motion.button
                onClick={() => setShowVideo(!showVideo)}
                className={`hidden sm:flex p-2 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg transition-colors ${showVideo ? "text-accent-light bg-accent/10" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                whileTap={{ scale: 0.9 }}
                title="Toggle Video Player"
              >
                <Tv className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
            <span className={`text-xs tabular-nums ${isDark ? "text-dark-100" : "text-slate-500"}`}>
              {formatTime(progress)} / {formatTime(duration)}
            </span>

            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}>
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 accent-accent cursor-pointer bg-slate-200 dark:bg-white/10"
              />
            </div>

            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${showQueue ? "text-accent-light bg-accent/10" : isDark ? "text-dark-100 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
