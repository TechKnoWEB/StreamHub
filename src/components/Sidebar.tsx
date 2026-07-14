import type { ComponentType, Dispatch, SetStateAction } from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Tv, Monitor, Trophy, Sun, Moon, Home, TvMinimalPlay, Music, X, Info } from "lucide-react"
import { useTheme } from "../context/ThemeContext"

type Tab = "home" | "iptv" | "catalog" | "sports" | "music" | "about" | "legal"

interface SidebarProps {
  activeTab: Tab
  onTabChange: Dispatch<SetStateAction<Tab>>
  isOpen: boolean
  onClose: () => void
}

const navItems: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "iptv", label: "Live Streams", icon: Tv },
  { id: "catalog", label: "IPTV Channels", icon: TvMinimalPlay },
  { id: "sports", label: "Live Sports", icon: Trophy },
  { id: "music", label: "Stream Music", icon: Music },
  { id: "about", label: "About", icon: Info },
]

const SPRING_CONFIG = { type: "spring" as const, stiffness: 380, damping: 30 }
const STAGGER_DELAY = 0.05

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
  const { theme, toggle } = useTheme()
  const isDark = theme === "dark"
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNav = (id: Tab) => {
    onTabChange(id)
    onClose()
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      <motion.div
        className="fixed inset-0 z-40 lg:hidden"
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.aside
        className={`fixed top-0 left-0 z-50 h-full w-64 flex flex-col shrink-0 transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isDark
            ? "glass border-r border-white/5"
            : "bg-white/80 backdrop-blur-xl border-r border-slate-200"
          }`}
      >
        {/* Logo */}
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-sport-green flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                StreamHub
              </h1>
              <p className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                IPTV Dashboard
              </p>
            </div>
          </motion.div>
          {/* Close button — mobile only */}
          <motion.button
            onClick={onClose}
            className={`lg:hidden p-2 rounded-xl transition-colors ${
              isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-400"
            }`}
            aria-label="Close menu"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }, index) => {
            const isActive = activeTab === id
            return (
              <motion.button
                key={id}
                onClick={() => handleNav(id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? isDark
                      ? "text-accent-light"
                      : "text-accent-dark"
                    : isDark
                      ? "text-dark-100 hover:text-white"
                      : "text-slate-500 hover:text-slate-900"
                }`}
                initial={mounted ? false : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * STAGGER_DELAY,
                  duration: 0.3,
                  ease: "easeOut",
                }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-xl ${
                      isDark
                        ? "bg-accent/20 border border-accent/30 shadow-lg shadow-accent/10"
                        : "bg-accent/10 border border-accent/20 shadow-md shadow-accent/10"
                    }`}
                    transition={SPRING_CONFIG}
                  />
                )}

                {/* Icon with micro-interaction */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    rotate: isActive ? 5 : 0,
                  }}
                  transition={SPRING_CONFIG}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>

                {/* Label */}
                <span className="relative z-10">{label}</span>
              </motion.button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t space-y-2 safe-area-bottom ${isDark ? "border-white/5" : "border-slate-200"}`}>
          {/* Theme Toggle */}
          <motion.button
            onClick={toggle}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
              isDark
                ? "text-dark-100 hover:text-white hover:bg-white/10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            }`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? "sun" : "moon"}
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </motion.button>

          {/* Status */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              isDark ? "bg-white/5" : "bg-slate-100"
            }`}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-sport-green"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}>
              System Ready
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
