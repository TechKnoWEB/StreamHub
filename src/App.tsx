import { useState, useEffect } from "react"
import { Menu, Monitor } from "lucide-react"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import { LiveStreamProvider } from "./context/LiveStreamContext"
import Sidebar from "./components/Sidebar"
import HomePage from "./components/HomePage"
import IPTVPlayer from "./components/IPTVPlayer"
import IPTVCatalog from "./components/IPTVCatalog"
import LiveSports from "./components/LiveSports"
import LegalDisclaimer from "./components/LegalDisclaimer"

export type Tab = "home" | "iptv" | "catalog" | "sports" | "legal"

const VALID_TABS: Tab[] = ["home", "iptv", "catalog", "sports", "legal"]

function getInitialTab(): Tab {
  const hash = window.location.hash.replace("#", "")
  if (VALID_TABS.includes(hash as Tab)) return hash as Tab
  return "home"
}

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
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`p-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-500"
            }`}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-sport-green flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <span className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              StreamHub
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === "home" && <HomePage onNavigate={setActiveTab} />}
          {activeTab === "iptv" && <IPTVPlayer />}
          {activeTab === "catalog" && <IPTVCatalog />}
          {activeTab === "sports" && <LiveSports />}
          {activeTab === "legal" && <LegalDisclaimer />}
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
