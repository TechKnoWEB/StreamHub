import { useState, useEffect, lazy, Suspense, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Monitor, Sun, Moon, Loader2 } from "lucide-react"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import { LiveStreamProvider } from "./context/LiveStreamContext"
import Sidebar from "./components/Sidebar"
import HomePage from "./components/HomePage"
import AboutPage from "./components/AboutPage"
import LegalDisclaimer from "./components/LegalDisclaimer"
import BottomNav from "./components/BottomNav"
import PWAInstallBanner from "./components/PWAInstallBanner"

const LiveStreams = lazy(() => import("./components/LiveStreams"))
const IPTVChannels = lazy(() => import("./components/IPTVChannels"))
const LiveSports = lazy(() => import("./components/LiveSports"))

const MusicPortal = lazy(() => import("./music/components/MusicPortal"))

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
  const { theme, toggle: toggleTheme } = useTheme()
  const isDark = theme === "dark"

  function LazyPage({ children }: { children: ReactNode }) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-accent-light" : "text-accent"}`} />
        </div>
      }>
        {children}
      </Suspense>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomePage key="home" onNavigate={setActiveTab} />
      case "iptv":
        return <LazyPage key="iptv"><LiveStreams /></LazyPage>
      case "catalog":
        return <LazyPage key="catalog"><IPTVChannels /></LazyPage>
      case "sports":
        return <LazyPage key="sports"><LiveSports /></LazyPage>
      case "music":
        return <LazyPage key="music"><MusicPortal /></LazyPage>
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
          className={`lg:hidden flex items-center justify-between px-4 py-3 border-b shrink-0 safe-area-top ${
            isDark
              ? "bg-dark-300/50 backdrop-blur-xl border-white/5"
              : "bg-white/80 backdrop-blur-xl border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-sport-green flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <span className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              StreamHub
            </span>
          </div>
          <motion.button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-500"
            }`}
            aria-label="Toggle theme"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              key={isDark ? "sun" : "moon"}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.div>
          </motion.button>
        </header>

        {/* Main Content with Crossfade */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[72px] lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={CONTENT_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={CONTENT_TRANSITION}
              className="min-h-full h-full overflow-y-auto"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Bottom Navigation — mobile only */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* PWA Install Banner */}
      <PWAInstallBanner />
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
