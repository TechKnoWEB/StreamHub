import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, WifiOff, RefreshCw, ExternalLink } from "lucide-react"
import VideoPlayer from "./VideoPlayer"

export interface StreamSource {
  id: string
  streamNo: number
  language: string
  hd: boolean
  embedUrl: string
  source: string
  viewers: number
}

interface SportsPlayerProps {
  sources: StreamSource[]
  activeSource: StreamSource | null
  onSourceChange: (source: StreamSource) => void
  title?: string
  fillContainer?: boolean
}

const IFRAME_TIMEOUT_MS = 25000
const RETRY_COOLDOWN_MS = 30000

function isDirectStream(url: string): boolean {
  return /\.(m3u8|mp4|webm)(\?|$)/i.test(url)
}

export default function SportsPlayer({
  sources,
  activeSource,
  onSourceChange,
  title,
  fillContainer = false,
}: SportsPlayerProps) {
  const [loading, setLoading] = useState(true)
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set())
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const lastRetryRef = useRef(0)

  const isDirect = activeSource ? isDirectStream(activeSource.embedUrl) : false
  const allSourcesFailed = sources.length > 0 && failedSources.size >= sources.length
  const availableSources = sources.filter((s) => !failedSources.has(`${s.id}-${s.streamNo}`))
  const currentSource = activeSource && sources.some((s) => s.streamNo === activeSource.streamNo && s.id === activeSource.id)
    ? activeSource
    : availableSources[0] || null
  const firstSourceUrl = sources[0]?.embedUrl || null

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Reset failed set when sources list changes
  useEffect(() => {
    setFailedSources(new Set())
    setLoading(true)
  }, [sources])

  // Sync active source with available sources
  useEffect(() => {
    if (!activeSource || !currentSource) return
    if (currentSource.streamNo !== activeSource.streamNo || currentSource.id !== activeSource.id) {
      onSourceChange(currentSource)
    }
  }, [currentSource?.streamNo, currentSource?.id])

  // Iframe timeout detection
  useEffect(() => {
    if (isDirect || !activeSource || allSourcesFailed) return

    setLoading(true)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      markFailedAndAdvance(activeSource)
    }, IFRAME_TIMEOUT_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [activeSource?.embedUrl, isDirect, allSourcesFailed])

  const markFailedAndAdvance = useCallback((failedSource: StreamSource) => {
    if (!mountedRef.current) return
    setFailedSources((prev) => new Set(prev).add(`${failedSource.id}-${failedSource.streamNo}`))

    const remaining = sources.filter(
      (s) => !failedSources.has(`${s.id}-${s.streamNo}`) && !(s.streamNo === failedSource.streamNo && s.id === failedSource.id)
    )

    if (remaining.length > 0) {
      const nextSource = remaining[0]
      onSourceChange(nextSource)
    }
  }, [sources, failedSources, onSourceChange])

  const handleIframeLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (mountedRef.current) {
      setLoading(false)
    }
  }

  const handleRetry = useCallback(() => {
    const now = Date.now()
    if (now - lastRetryRef.current < RETRY_COOLDOWN_MS) return
    lastRetryRef.current = now
    setFailedSources(new Set())
    setLoading(true)
    if (sources.length > 0) onSourceChange(sources[0])
  }, [sources, onSourceChange])

  // Direct stream — use native VideoPlayer
  if (isDirect && currentSource) {
    return (
      <VideoPlayer
        key={currentSource.embedUrl}
        src={currentSource.embedUrl}
        title={title ? `${title} — ${currentSource.language}` : undefined}
        fillContainer={fillContainer}
      />
    )
  }

  // Iframe embed
  return (
    <div className={`relative bg-black ${fillContainer ? "h-full" : "aspect-video"}`}>
      {/* Loading overlay */}
      {loading && !allSourcesFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-accent-light animate-spin mx-auto mb-3" />
            <p className="text-sm text-dark-100">
              Connecting to source {failedSources.size + 1}/{sources.length}...
            </p>
            {failedSources.size > 0 && (
              <p className="text-xs text-sport-yellow mt-2">
                {failedSources.size} source{failedSources.size > 1 ? "s" : ""} timed out, trying next...
              </p>
            )}
          </div>
        </div>
      )}

      {/* All sources failed */}
      {allSourcesFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center px-6 max-w-sm">
            <WifiOff className="w-10 h-10 text-sport-red mx-auto mb-3" />
            <p className="text-base font-semibold text-white mb-1">
              All stream sources unavailable
            </p>
            <p className="text-xs text-dark-100 mb-4 leading-relaxed">
              All {sources.length} source{sources.length > 1 ? "s" : ""} failed to respond.
              The upstream provider may be temporarily down.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry All Sources
            </button>
            {firstSourceUrl && (
              <a
                href={firstSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl transition-colors ml-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Tab
              </a>
            )}
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={currentSource?.embedUrl || ""}
        className={`w-full h-full border-0 ${loading || allSourcesFailed ? "invisible" : ""}`}
        title={title || "Sports Stream"}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        onLoad={handleIframeLoad}
      />
    </div>
  )
}
