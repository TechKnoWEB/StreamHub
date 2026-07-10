import { useRef, useState, useCallback, useEffect } from "react"

interface AudioPlayerOptions {
  onTrackEnd?: () => void
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onError?: (error: string) => void
}

export function useAudioPlayer(options?: AudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const optionsRef = useRef(options)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = 0.8
      audioRef.current.preload = "metadata"
    }

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      optionsRef.current?.onTimeUpdate?.(audio.currentTime)
    }

    const handleDurationChange = () => {
      setDuration(audio.duration || 0)
      optionsRef.current?.onDurationChange?.(audio.duration || 0)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      optionsRef.current?.onTrackEnd?.()
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    const handleError = () => {
      const err = audio.error
      let msg = "Stream unavailable"
      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            msg = "Playback aborted"
            break
          case MediaError.MEDIA_ERR_NETWORK:
            msg = "Network error - stream may be offline"
            break
          case MediaError.MEDIA_ERR_DECODE:
            msg = "Audio decode error"
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            msg = "Stream format not supported"
            break
        }
      }
      setIsPlaying(false)
      optionsRef.current?.onError?.(msg)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("error", handleError)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("error", handleError)
    }
  }, [])

  const loadAndPlay = useCallback(async (url: string) => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.src === url) {
      if (audio.paused) {
        await audio.play().catch(() => {})
      } else {
        audio.pause()
      }
      return
    }

    audio.src = url
    audio.load()
    try {
      await audio.play()
    } catch {
      // Autoplay blocked - user interaction needed
    }
  }, [])

  const play = useCallback(async () => {
    await audioRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      await audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol))
    if (audioRef.current) {
      audioRef.current.volume = clamped
    }
    setVolumeState(clamped)
    if (clamped > 0) setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setIsMuted(!isMuted)
  }, [isMuted])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    loadAndPlay,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    stop,
  }
}
