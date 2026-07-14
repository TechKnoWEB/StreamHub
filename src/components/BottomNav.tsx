import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Home, Tv, Trophy, Music, Plus, TvMinimalPlay, Info, Scale } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import type { Tab } from "../App"

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const mainTabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "iptv", label: "LiveStream", icon: Tv },
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "catalog", label: "TV", icon: TvMinimalPlay },
]

const overflowTabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "music", label: "Music", icon: Music },
  { id: "about", label: "About", icon: Info },
  { id: "legal", label: "Legal", icon: Scale },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [showMore, setShowMore] = useState(false)

  const handleTab = (id: Tab) => {
    onTabChange(id)
    setShowMore(false)
  }

  return (
    <>
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 pb-safe
          ${isDark
            ? "bg-dark-300/90 backdrop-blur-xl border-t border-white/5"
            : "bg-white/90 backdrop-blur-xl border-t border-slate-200"
          }`}
      >
        {mainTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <motion.button
              key={id}
              onClick={() => handleTab(id)}
              className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-colors
                ${isActive
                  ? isDark ? "text-accent-light" : "text-accent-dark"
                  : isDark ? "text-dark-100" : "text-slate-500"
                }`}
              whileTap={{ scale: 0.92 }}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomTab"
                  className={`absolute inset-0 rounded-xl ${
                    isDark ? "bg-accent/15" : "bg-accent/10"
                  }`}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <Icon className="w-5 h-5" />
              </div>
              <span className="relative z-10 text-[10px] font-medium leading-none">{label}</span>
            </motion.button>
          )
        })}

        {/* More button */}
        <motion.button
          onClick={() => setShowMore(!showMore)}
          className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-colors
            ${showMore
              ? isDark ? "text-accent-light" : "text-accent-dark"
              : isDark ? "text-dark-100" : "text-slate-500"
            }`}
          whileTap={{ scale: 0.92 }}
        >
          {showMore && (
            <motion.div
              layoutId="bottomTab"
              className={`absolute inset-0 rounded-xl ${
                isDark ? "bg-accent/15" : "bg-accent/10"
              }`}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <motion.div
            className="relative z-10"
            animate={{ rotate: showMore ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Plus className="w-5 h-5" />
          </motion.div>
          <span className="relative z-10 text-[10px] font-medium leading-none">More</span>
        </motion.button>
      </nav>

      {/* More popover */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              className="fixed inset-0 z-30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
            />
            <motion.div
              className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[220px] rounded-2xl border shadow-2xl overflow-hidden lg:hidden
                ${isDark
                  ? "bg-dark-300 border-white/10"
                  : "bg-white border-slate-200"
                }`}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              {overflowTabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <motion.button
                    key={id}
                    onClick={() => handleTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors
                      ${isActive
                        ? isDark ? "bg-accent/20 text-accent-light" : "bg-accent/10 text-accent-dark"
                        : isDark ? "text-dark-100 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{label}</span>
                    {isActive && (
                      <motion.div
                        className={`ml-auto w-1.5 h-1.5 rounded-full ${
                          isDark ? "bg-accent-light" : "bg-accent-dark"
                        }`}
                        layoutId="moreDot"
                      />
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
