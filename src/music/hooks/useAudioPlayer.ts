import { useRef, useState, useCallback, useEffect } from "react"

interface AudioPlayerOptions {
  onTrackEnd?: () => void
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
}

export function useAudioPlayer(options?: AudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = 0.8
      audioRef.current.preload = "metadata"
    }

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      options?.onTimeUpdate?.(audio.currentTime)
    }

    const handleDurationChange = () => {
      setDuration(audio.duration || 0)
      options?.onDurationChange?.(audio.duration || 0)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      options?.onTrackEnd?.()
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
  }, [options])

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
      // Autoplay blocked — user interaction needed
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
