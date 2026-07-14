import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, Smartphone } from "lucide-react"
import { useTheme } from "../context/ThemeContext"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function PWAInstallBanner() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try { if (sessionStorage.getItem("pwa-dismissed")) setDismissed(true) } catch {}
  }, [])

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a delay for better UX
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener("beforeinstallprompt", handler)

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === "accepted") {
        setShowBanner(false)
      }
      setDeferredPrompt(null)
    } catch (error) {
      console.error("Install prompt failed:", error)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    // Don't show again for this session
    sessionStorage.setItem("pwa-dismissed", "true")
  }

  if (isInstalled || dismissed) return null

  return (
    <AnimatePresence>
      {showBanner && deferredPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe ${
            isDark
              ? "bg-gradient-to-t from-dark-500/98 via-dark-400/95 to-transparent"
              : "bg-gradient-to-t from-slate-900/98 via-slate-800/95 to-transparent"
          }`}
        >
          <div
            className={`max-w-md mx-auto p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${
              isDark
                ? "bg-dark-300/80 border-white/10"
                : "bg-white/90 border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                isDark ? "bg-accent/20" : "bg-accent/10"
              }`}>
                <Smartphone className={`w-5 h-5 ${isDark ? "text-accent-light" : "text-accent-dark"}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold mb-0.5 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}>
                  Install StreamHub
                </h3>
                <p className={`text-xs mb-3 ${
                  isDark ? "text-dark-100" : "text-slate-500"
                }`}>
                  Add to your home screen for the best experience
                </p>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstall}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isDark
                        ? "bg-accent hover:bg-accent-light text-white"
                        : "bg-accent hover:bg-accent-dark text-white"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDismiss}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                      isDark
                        ? "bg-white/5 hover:bg-white/10 text-dark-100"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    Not now
                  </motion.button>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  isDark
                    ? "hover:bg-white/10 text-dark-100"
                    : "hover:bg-slate-100 text-slate-400"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
