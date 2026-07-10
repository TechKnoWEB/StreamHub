import { useState } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useMusic } from "../hooks/useMusic"
import { Plus, ListMusic, Trash2, PlayCircle, Music, X, Edit3, Check, Heart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import TrackCard from "./TrackCard"

export default function MyPlaylists() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const {
    state,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    playQueue,
    removeFromPlaylist,
    removeFromRecentlyPlayed,
  } = useMusic()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const strongText = isDark ? "text-white" : "text-slate-900"
  const panelClass = isDark ? "bg-dark-300/30 border-white/[0.06]" : "bg-white border-slate-200"

  const recentFavorites = state.recentlyPlayed.filter((t) => state.favorites.includes(t.id))
  const queueFavorites = state.queue.filter((t) => state.favorites.includes(t.id))
  const savedFavorites = state.favoriteTracks.filter((t) => state.favorites.includes(t.id))
  const allFavoriteTracks = [...savedFavorites, ...recentFavorites, ...queueFavorites].filter(
    (track, index, array) => array.findIndex((item) => item.id === track.id) === index
  )

  const handleCreate = () => {
    if (!newName.trim()) return
    createPlaylist(newName.trim())
    setNewName("")
    setShowCreate(false)
  }

  const handleRename = (id: string) => {
    if (!editName.trim()) return
    renamePlaylist(id, editName.trim())
    setEditingId(null)
  }

  const activePl = state.playlists.find((p) => p.id === activePlaylist)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className={`w-4 h-4 ${mutedText}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>My Playlists</span>
        </div>
        <motion.button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold shadow-sm shadow-accent/20 hover:bg-accent-light transition-colors min-h-[44px]"
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Playlist
        </motion.button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${panelClass}`}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Playlist name..."
                autoFocus
                className={`flex-1 bg-transparent text-sm outline-none ${isDark ? "text-white placeholder:text-dark-100" : "text-slate-900 placeholder:text-slate-400"}`}
              />
              <button onClick={handleCreate} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-light transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setShowCreate(false)} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${isDark ? "text-dark-100 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activePl && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setActivePlaylist(null)} className={`text-xs shrink-0 ${isDark ? "text-dark-100 hover:text-white" : "text-slate-500 hover:text-slate-700"}`}>
                All Playlists
              </button>
              <span className={mutedText}>/</span>
              <h3 className={`text-sm font-bold truncate ${strongText}`}>{activePl.name}</h3>
              <span className={`text-xs shrink-0 ${mutedText}`}>({activePl.tracks.length})</span>
            </div>
            {activePl.tracks.length > 0 && (
              <motion.button
                onClick={() => playQueue(activePl.tracks, 0)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold shadow-sm shadow-accent/20 hover:bg-accent-light transition-colors min-h-[44px] shrink-0"
                whileTap={{ scale: 0.95 }}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Play All
              </motion.button>
            )}
          </div>

          {activePl.tracks.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border ${panelClass}`}>
              <Music className={`w-10 h-10 mx-auto mb-2 ${mutedText}`} />
              <p className={`text-sm ${mutedText}`}>No tracks yet. Search and add songs to this playlist.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activePl.tracks.map((track, i) => (
                <div key={`${track.id}-${i}`} className="relative group">
                  <TrackCard track={track} index={i} queue={activePl.tracks} />
                  <button
                    onClick={() => removeFromPlaylist(activePl.id, i)}
                    className={`absolute top-3 right-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sport-red hover:bg-sport-red/10 transition-all z-10 ${
                      isDark ? "bg-dark-200/90" : "bg-white/90"
                    } md:opacity-0 md:group-hover:opacity-100`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {!activePl && (
        <div className="space-y-2">
          {state.playlists.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-center py-16 rounded-2xl border ${panelClass}`}
            >
              <ListMusic className={`w-12 h-12 mx-auto mb-3 ${mutedText}`} />
              <p className={`text-sm font-medium ${mutedText}`}>No playlists yet</p>
              <p className={`text-xs mt-1 ${mutedText}`}>Create a playlist to save your favorite tracks</p>
            </motion.div>
          ) : (
            state.playlists.map((pl) => (
              <motion.div
                key={pl.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isDark
                    ? "bg-dark-300/30 border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
                    : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
                onClick={() => setActivePlaylist(pl.id)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                  <ListMusic className={`w-5 h-5 ${isDark ? "text-dark-100" : "text-slate-400"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === pl.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename(pl.id)}
                        autoFocus
                        className={`flex-1 bg-transparent text-sm font-bold outline-none border-b border-accent ${isDark ? "text-white" : "text-slate-900"}`}
                      />
                      <button onClick={() => handleRename(pl.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-accent">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className={`text-sm font-bold truncate ${strongText}`}>{pl.name}</p>
                  )}
                  <p className={`text-xs ${mutedText}`}>
                    {pl.tracks.length} tracks &middot; {new Date(pl.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setEditingId(pl.id)
                      setEditName(pl.name)
                    }}
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${isDark ? "text-dark-100 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sport-red hover:bg-sport-red/10`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {!activePl && state.favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3.5 h-3.5 text-sport-red fill-current" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>Favorites ({state.favorites.length})</span>
          </div>
          {allFavoriteTracks.length > 0 ? (
            <div className="space-y-2">
              {allFavoriteTracks.slice(0, 10).map((track, i) => (
                <TrackCard key={`fav-${track.id}-${i}`} track={track} index={i} queue={allFavoriteTracks} />
              ))}
            </div>
          ) : (
            <p className={`text-xs ${mutedText}`}>
              Favorited tracks are saved across sessions. Click the heart icon on any track to add it here.
            </p>
          )}
        </div>
      )}

      {!activePl && state.recentlyPlayed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>Recently Played ({state.recentlyPlayed.length})</span>
          </div>
          <div className="space-y-2">
            {state.recentlyPlayed.slice(0, 6).map((track, i) => (
              <div key={`recent-${track.id}-${i}`} className="group flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <TrackCard track={track} index={i} queue={state.recentlyPlayed} />
                </div>
                <motion.button
                  onClick={() => removeFromRecentlyPlayed(track.id)}
                  className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sport-red hover:bg-sport-red/10 transition-all shrink-0 md:opacity-0 md:group-hover:opacity-100 ${
                    isDark ? "bg-dark-300/30 border border-white/[0.06]" : "bg-white border border-slate-200"
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
