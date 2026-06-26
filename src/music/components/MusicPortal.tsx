import { useState } from "react"
import { useTheme } from "../../context/ThemeContext"
import { Music, Keyboard } from "lucide-react"
import YouTubeSearch from "./YouTubeSearch"
import InternetRadio from "./InternetRadio"
import MyPlaylists from "./MyPlaylists"
import MusicPlayer from "./MusicPlayer"
import { MusicProvider } from "../MusicContext"
import { motion, AnimatePresence } from "framer-motion"
import type { MusicSource } from "../types"

type MusicTab = MusicSource | "playlists"

const TABS: { id: MusicTab; label: string; emoji: string }[] = [
  { id: "youtube", label: "YouTube Music", emoji: "\uD83C\uDFA5" },
  { id: "radio", label: "Internet Radio", emoji: "\uD83D\uDCFB" },
  { id: "playlists", label: "My Playlists", emoji: "\uD83C\uDFB5" },
]

function MusicPortalContent() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [activeTab, setActiveTab] = useState<MusicTab>("youtube")
  const [showShortcuts, setShowShortcuts] = useState(false)

  const panelClass = isDark
    ? "bg-dark-300/30 border-white/[0.06]"
    : "bg-white border-slate-200"

  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const strongText = isDark ? "text-white" : "text-slate-900"

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-24">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={`text-2xl sm:text-3xl font-extrabold ${strongText}`}>
              Stream Music
            </h1>
            <p className={`mt-1 max-w-2xl text-sm sm:text-base ${mutedText}`}>
              Search YouTube Music, browse 45,000+ internet radio stations worldwide — all free, no login required.
            </p>
          </div>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark ? "bg-white/5 text-dark-100 hover:bg-white/10" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Shortcuts
          </button>
        </div>

        {/* Keyboard Shortcuts Panel */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className={`p-3 rounded-xl border ${isDark ? "bg-white/5 border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                <p className={`text-xs font-bold mb-2 ${strongText}`}>Keyboard Shortcuts</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "Space", action: "Play / Pause" },
                    { key: "\u2190", action: "Seek -10s" },
                    { key: "\u2192", action: "Seek +10s" },
                    { key: "Shift+\u2190", action: "Previous track" },
                    { key: "Shift+\u2192", action: "Next track" },
                    { key: "\u2191\u2193", action: "Volume" },
                    { key: "M", action: "Mute" },
                    { key: "S", action: "Shuffle" },
                    { key: "R", action: "Repeat" },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${isDark ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700"}`}>
                        {s.key}
                      </kbd>
                      <span className={`text-[10px] ${mutedText}`}>{s.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Tab Switcher */}
      <div className={`flex gap-1 p-1 rounded-xl ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? isDark
                  ? "bg-accent/20 text-accent-light border border-accent/30 shadow-sm shadow-accent/10"
                  : "bg-white text-accent-dark border border-accent/20 shadow-sm"
                : isDark
                  ? "text-dark-100 hover:text-white hover:bg-white/5"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <span className="text-sm sm:text-lg">{tab.emoji}</span>
            <span className="text-[10px] sm:text-sm font-semibold truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "youtube" && <YouTubeSearch />}
          {activeTab === "radio" && <InternetRadio />}
          {activeTab === "playlists" && <MyPlaylists />}
        </motion.div>
      </AnimatePresence>

      {/* Persistent Player */}
      <MusicPlayer />
    </div>
  )
}

export default function MusicPortal() {
  return (
    <MusicProvider>
      <MusicPortalContent />
    </MusicProvider>
  )
}
