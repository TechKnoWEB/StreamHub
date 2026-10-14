import { useEffect, useRef, useState, useCallback } from "react"
import Hls from "hls.js"
import { shouldRecoverStall, hasPlaybackProgress } from "../lib/playback-recovery"
import { createRecoveryScheduler, retryDelayFromResponse } from "../lib/recovery-scheduler"
import { isHlsSource } from "../lib/streamfree-sources"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  WifiOff,
  AlertTriangle,
} from "lucide-react"

interface VideoPlayerProps {
  src: string
  title?: string
  fillContainer?: boolean
}

function toProxyUrl(url: string): string {
  if (url.startsWith("/api/streamfree?")) return url
  if (typeof window === "undefined") return url
  if (window.location.protocol === "file:") return url
  return `/api/iptv-proxy?url=${encodeURIComponent(url)}`
}

export default function VideoPlayer({ src, title, fillContainer = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const recoveryRef = useRef<ReturnType<typeof createRecoveryScheduler> | null>(null)
  const [buffering, setBuffering] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hlsRef = useRef<Hls | null>(null)

  const isHEVC = src.toLowerCase().includes("hvc1") || src.toLowerCase().includes("hev1")

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setLoading(true)
    setError(null)
    setReconnecting(false)
    setBuffering(false)
    setRetrySeconds(0)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setProgress(0)
    hlsRef.current?.destroy()
    hlsRef.current = null

    const playableSrc = isHlsSource(src) ? toProxyUrl(src) : src

    if (isHlsSource(src)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          liveSyncDurationCount: 5,
          liveMaxLatencyDurationCount: 10,
          maxBufferLength: 30,
        })
        let lastProgressAt = Date.now()
        let lastTime = video.currentTime
        let lastRecoveryAt = 0
        let stableSince: number | undefined
        let waitUntil = 0
        const recovery = createRecoveryScheduler({
          onStatus: ({ phase, until }) => {
            setReconnecting(phase === 'reconnecting')
            waitUntil = phase === 'waiting' ? until! : 0
            setRetrySeconds(waitUntil ? Math.max(1, Math.ceil((waitUntil - Date.now()) / 1000)) : 0)
            if (phase === 'waiting' || phase === 'paused') setLoading(false)
          },
          onGiveUp: () => {
            hls.stopLoad()
            setError("The video provider is not delivering the stream reliably. Please try again later.")
            setLoading(false)
          },
          onRetry: (media) => {
            lastRecoveryAt = Date.now()
            lastProgressAt = Date.now()
            stableSince = undefined
            setError(null)
            if (media) hls.recoverMediaError()
            else {
              hls.stopLoad()
              hls.loadSource(playableSrc)
              hls.startLoad(-1)
            }
          },
        })
        recoveryRef.current = recovery
        const watchdog = setInterval(() => {
          if (recovery.isFailed()) return
          const now = Date.now()
          if (waitUntil) setRetrySeconds(Math.max(1, Math.ceil((waitUntil - now) / 1000)))
          if (recovery.isWaiting()) return
          if (hasPlaybackProgress(video.currentTime, lastTime, video.readyState)) {
            lastTime = video.currentTime
            lastProgressAt = now
            setReconnecting(false)
            setError(null)
            stableSince ??= now
            if (now - stableSince > 60_000) recovery.resetAttempts()
          } else {
            stableSince = undefined
            if (video.paused) lastProgressAt = now
            else if (shouldRecoverStall({ paused: video.paused, ended: video.ended, lastProgressAt, lastRecoveryAt, now })) recovery.request()
          }
        }, 2000)
        hlsRef.current = hls
        hls.loadSource(playableSrc)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false)
          if (recovery.mayPlay()) video.play().catch(() => {})
          // The video play event confirms playback; manifest loading alone does not.
        })

        hls.on(Hls.Events.ERROR, (_, data) => {
          const network = data.networkDetails
          const retryHeader = network?.getResponseHeader?.('Retry-After') ?? network?.headers?.get?.('Retry-After')
          const delay = retryDelayFromResponse(data.response?.code ?? network?.status, retryHeader)
          if (delay !== undefined) {
            hls.stopLoad()
            recovery.defer(delay)
            return
          }
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { recovery.request(); return }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !isHEVC) { recovery.request(true); return }
            let reason: string
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (isHEVC) {
                reason = "HEVC (H.265) codec not supported by this browser"
              } else {
                reason = "Media decode error"
              }
            } else {
              reason = data.details || "Unknown error"
            }
            setError(`Stream failed: ${reason}`)
            setLoading(false)
          }
        })
        return () => {
          clearInterval(watchdog)
          recovery.dispose()
          if (recoveryRef.current === recovery) recoveryRef.current = null
          hls.destroy()
        }
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playableSrc
        return () => { video.src = "" }
      } else {
        setError("HLS playback not supported in this browser.")
        setLoading(false)
      }
    } else {
      video.src = src
      return () => { video.src = "" }
    }
  }, [src, isHEVC, reloadKey])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      recoveryRef.current?.resume()
      videoRef.current.play().catch(() => {})
    } else {
      recoveryRef.current?.pause()
      videoRef.current.pause()
    }
    setPlaying(!videoRef.current.paused)
  }, [])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }, [])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (!videoRef.current) return
    videoRef.current.volume = v
    videoRef.current.muted = v === 0
    setVolume(v)
    setMuted(v === 0)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
    setDuration(v.duration)
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    if (v?.duration) v.currentTime = pos * v.duration
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }, [])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000) as unknown as ReturnType<typeof setTimeout>
  }, [playing])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`
  }

  return (
    <div
      ref={containerRef}
      className={`relative group rounded-2xl overflow-hidden bg-black shadow-2xl ${
        fillContainer ? "h-full" : ""
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={`w-full object-contain cursor-pointer ${
          fillContainer ? "h-full" : "aspect-video"
        }`}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setLoading(false)}
        onWaiting={() => setBuffering(true)}
        onStalled={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
        webkit-playsinline="true"
      />

      {(retrySeconds > 0 || reconnecting || (buffering && playing)) && !error && (
        <div role="status" className="absolute top-12 left-3 right-3 z-20 rounded-lg bg-black/80 px-3 py-2 text-sm text-white">
          {retrySeconds > 0 ? `Provider requested a wait. Retrying in ${retrySeconds}s…` : reconnecting ? "Reconnecting to the stream…" : "Buffering — waiting for video from the provider…"}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-accent-light animate-spin mx-auto mb-3" />
            <p className="text-sm text-dark-100">Loading stream...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-8 max-w-md">
            {isHEVC && error.includes("HEVC") ? (
              <AlertTriangle className="w-12 h-12 text-sport-yellow mx-auto mb-4" />
            ) : (
              <WifiOff className="w-8 h-8 text-sport-red mx-auto mb-4" />
            )}
            <p className="text-lg font-semibold text-white mb-2">Stream Error</p>
            <p className="text-sm text-dark-100 break-words">{error}</p>
            <button onClick={() => setReloadKey((key) => key + 1)} className="relative z-30 mt-3 rounded-lg bg-accent px-4 py-2 text-white">Reconnect</button>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-3 sm:px-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seek bar — taller on mobile for easier tapping */}
        <div className="h-1.5 sm:h-1 bg-white/20 rounded-full cursor-pointer mb-3 sm:mb-4 group/progress min-h-[12px] sm:min-h-0 flex items-center" onClick={handleSeek}>
          <div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full relative w-full" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 sm:group-hover/progress:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play button — larger on mobile */}
            <button aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              {playing ? <Pause className="w-5 h-5 sm:w-4 sm:h-4 text-white" /> : <Play className="w-5 h-5 sm:w-4 sm:h-4 text-white ml-0.5" />}
            </button>

            {/* Volume — slider hidden on mobile, mute toggle always visible */}
            <div className="flex items-center gap-2">
              <button aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className="text-white/70 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolume} className="hidden sm:block w-20 h-1 accent-accent cursor-pointer" />
            </div>

            <span className="text-[11px] sm:text-xs text-white/60 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <button aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            {fullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {title && (
        <div className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            {title}
            {isHEVC && <span className="px-1.5 py-0.5 text-[10px] bg-sport-yellow/20 text-sport-yellow rounded">HEVC</span>}
          </h3>
        </div>
      )}
    </div>
  )
}
