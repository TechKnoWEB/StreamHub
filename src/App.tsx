import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, Monitor } from "lucide-react"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import { LiveStreamProvider } from "./context/LiveStreamContext"
import Sidebar from "./components/Sidebar"
import HomePage from "./components/HomePage"
import LiveStreams from "./components/LiveStreams"
import IPTVChannels from "./components/IPTVChannels"
import LiveSports from "./components/LiveSports"
import LegalDisclaimer from "./components/LegalDisclaimer"
import AboutPage from "./components/AboutPage"
import MusicPortal from "./music/components/MusicPortal"

export type Tab = "home" | "iptv" | "catalog" | "sports" | "music" | "about" | "legal"

const VALID_TABS: Tab[] = ["home", "iptv", "catalog", "sports", "music", "about", "legal"]

function getInitialTab(): Tab {
  const hash = window.location.hash.replace("#", "")
  if (VALID_TABS.includes(hash as Tab)) return hash as Tab
  return "home"
}

const CONTENT_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const CONTENT_TRANSITION = { duration: 0.2, ease: "easeOut" as const }

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)

  useEffect(() => {
    window.location.hash = activeTab
  }, [activeTab])

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (VALID_TABS.includes(hash as Tab)) {
        setActiveTab(hash as Tab)
      }
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomePage key="home" onNavigate={setActiveTab} />
      case "iptv":
        return <LiveStreams key="iptv" />
      case "catalog":
        return <IPTVChannels key="catalog" />
      case "sports":
        return <LiveSports key="sports" />
      case "music":
        return <MusicPortal key="music" />
      case "about":
        return <AboutPage key="about" onNavigate={setActiveTab} />
      case "legal":
        return <LegalDisclaimer key="legal" />
      default:
        return <HomePage key="home" onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-500 text-text-primary transition-colors">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header
          className={`lg:hidden flex items-center gap-3 px-4 py-3 border-b shrink-0 safe-area-top ${
            isDark
              ? "bg-dark-300/50 backdrop-blur-xl border-white/5"
              : "bg-white/80 backdrop-blur-xl border-slate-200"
          }`}
        >
          <motion.button
            onClick={() => setMobileMenuOpen(true)}
            className={`p-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-500"
            }`}
            aria-label="Open menu"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-sport-green flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <span className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              StreamHub
            </span>
          </div>
        </header>

        {/* Main Content with Crossfade */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={CONTENT_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TRANSITION}
              className="min-h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LiveStreamProvider>
        <AppShell />
      </LiveStreamProvider>
    </ThemeProvider>
  )
}
