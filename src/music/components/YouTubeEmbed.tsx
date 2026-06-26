import { motion } from "framer-motion"
import { Minimize2, Maximize2, X } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useYouTubePlayer, type YouTubeControls } from "../hooks/useYouTubePlayer"

interface YouTubeEmbedProps {
  videoId: string
  visible?: boolean
  onClose?: () => void
  onControlsReady?: (controls: YouTubeControls) => void
  onControlsCleanup?: () => void
  onStateChange?: (state: number) => void
}

function extractVideoId(url: string): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v")
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1)
  } catch { /* invalid URL */ }
  const match = url.match(/(?:v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function YouTubeEmbed({ videoId, visible = true, onClose, onControlsReady, onControlsCleanup, onStateChange }: YouTubeEmbedProps) {
  const [minimized, setMinimized] = useState(false)
  const id = useMemo(() => extractVideoId(videoId), [videoId])

  const { containerRef, isReady, controls } = useYouTubePlayer({
    videoId: id || "",
    onStateChange,
  })

  useEffect(() => {
    if (isReady && onControlsReady) {
      onControlsReady(controls)
    }
  }, [isReady, controls, onControlsReady])

  useEffect(() => {
    return () => {
      onControlsCleanup?.()
    }
  }, [onControlsCleanup])

  if (!id) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: visible ? 1 : 0,
        scale: !visible ? 0.001 : minimized ? 0.4 : 1,
        y: minimized ? 0 : 0,
        x: !visible ? -9999 : minimized ? "calc(50vw - 100px)" : 0,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`fixed z-30 overflow-hidden rounded-xl shadow-2xl transition-all duration-300 ${
        !visible
          ? "pointer-events-none opacity-0 w-[1px] h-[1px] -left-[9999px] -top-[9999px]"
          : minimized
            ? "bottom-28 right-4 w-[180px] h-[54px] sm:w-[200px] sm:h-[60px]"
            : "top-4 right-4 w-[min(340px,calc(100vw-32px))] aspect-video sm:w-[400px]"
      }`}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-1 right-1 flex gap-1">
        <button
          onClick={() => setMinimized(!minimized)}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export type { YouTubeControls } from "../hooks/useYouTubePlayer"
