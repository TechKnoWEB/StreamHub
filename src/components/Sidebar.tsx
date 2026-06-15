import type React from "react"
import { Tv, Monitor, List, Trophy, Sun, Moon, Home, X, Scale } from "lucide-react"
import { useTheme } from "../context/ThemeContext"

type Tab = "home" | "iptv" | "catalog" | "sports" | "legal"

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  isOpen: boolean
  onClose: () => void
}

const navItems: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "iptv", label: "IPTV Player", icon: Tv },
  { id: "catalog", label: "IPTV Catalog", icon: List },
  { id: "sports", label: "Live Sports", icon: Trophy },
  { id: "legal", label: "Legal & Terms", icon: Scale },
]

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
  const { theme, toggle } = useTheme()
  const isDark = theme === "dark"

  const handleNav = (id: Tab) => {
    onTabChange(id)
    onClose()
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        } drawer-backdrop`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 flex flex-col shrink-0 transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isDark
            ? "glass border-r border-white/5"
            : "bg-white/80 backdrop-blur-xl border-r border-slate-200"
          }`}
      >
        {/* Logo */}
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <div className="flex items-center gap-3">
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
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className={`lg:hidden p-2 rounded-xl transition-colors ${
              isDark ? "hover:bg-white/10 text-dark-100" : "hover:bg-slate-100 text-slate-400"
            }`}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? "bg-accent/20 text-accent-light border border-accent/30 shadow-lg shadow-accent/10"
                      : "bg-accent/10 text-accent-dark border border-accent/20 shadow-md shadow-accent/10"
                    : isDark
                      ? "text-dark-100 hover:text-white hover:bg-white/5"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t space-y-2 safe-area-bottom ${isDark ? "border-white/5" : "border-slate-200"}`}>
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isDark
                ? "bg-white/5 text-dark-100 hover:text-white hover:bg-white/10"
                : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                Dark Mode
              </>
            )}
          </button>

          {/* Status */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              isDark ? "bg-white/5" : "bg-slate-100"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-sport-green animate-pulse" />
            <span className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}>
              System Ready
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
