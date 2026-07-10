import { useRef, useState, useCallback, useEffect } from "react"

declare global {
  interface Window {
    YT: YT
    onYouTubeIframeAPIReady: () => void
  }
}

interface YT {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayerInstance
  PlayerState: {
    UNSTARTED: -1
    ENDED: 0
    PLAYING: 1
    PAUSED: 2
    BUFFERING: 3
    CUED: 5
  }
}

interface YTPlayerOptions {
  videoId: string
  playerVars?: Record<string, number | string | boolean>
  events?: {
    onReady?: () => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

interface YTPlayerInstance {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  loadVideoById: (videoId: string) => void
  destroy: () => void
}

export interface YouTubeControls {
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  getState: () => number
  setVolume: (vol: number) => void
  mute: () => void
  unMute: () => void
}

interface UseYouTubePlayerOptions {
  videoId: string
  onStateChange?: (state: number) => void
  onReady?: () => void
  onError?: (error: Error) => void
}

let apiLoading = false
let apiLoaded = false

function loadYTApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (apiLoaded && window.YT && window.YT.Player) {
      resolve()
      return
    }

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      resolve()
    }

    if (!apiLoading) {
      apiLoading = true
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      script.onerror = () => {
        reject(new Error("Failed to load YouTube IFrame API script"))
      }
      document.head.appendChild(script)
    }

    const check = setInterval(() => {
      if (apiLoaded && window.YT && window.YT.Player) {
        clearInterval(check)
        resolve()
      }
    }, 50)

    setTimeout(() => {
      clearInterval(check)
      if (!apiLoaded) {
        reject(new Error("YouTube IFrame API load timeout"))
      }
    }, 15000)
  })
}

export function useYouTubePlayer({ videoId, onStateChange, onReady, onError }: UseYouTubePlayerOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const callbacksRef = useRef({ onStateChange, onReady, onError })

  useEffect(() => {
    callbacksRef.current = { onStateChange, onReady, onError }
  })

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        await loadYTApi()
      } catch (err) {
        if (!cancelled) {
          callbacksRef.current.onError?.(err instanceof Error ? err : new Error("YouTube API failed to load"))
        }
        return
      }
      if (cancelled || !containerRef.current || !window.YT) return

      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId)
        return
      }

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onReady: () => {
              if (!cancelled) {
                setIsReady(true)
                callbacksRef.current.onReady?.()
              }
            },
            onStateChange: (event) => {
              if (!cancelled) {
                callbacksRef.current.onStateChange?.(event.data)
              }
            },
            onError: (event) => {
              if (!cancelled) {
                callbacksRef.current.onError?.(new Error(`YouTube player error (code ${event.data})`))
              }
            },
          },
        })
      } catch (err) {
        if (!cancelled) {
          callbacksRef.current.onError?.(err instanceof Error ? err : new Error("Failed to create YouTube player"))
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [videoId])

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
    }
  }, [])

  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo()
    } catch {
      // ignore
    }
  }, [])

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo()
    } catch {
      // ignore
    }
  }, [])

  const seekTo = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo(seconds, true)
    } catch {
      // ignore
    }
  }, [])

  const getCurrentTime = useCallback(() => {
    try {
      return playerRef.current?.getCurrentTime() ?? 0
    } catch {
      return 0
    }
  }, [])

  const getDuration = useCallback(() => {
    try {
      return playerRef.current?.getDuration() ?? 0
    } catch {
      return 0
    }
  }, [])

  const getState = useCallback(() => {
    try {
      return playerRef.current?.getPlayerState() ?? -1
    } catch {
      return -1
    }
  }, [])

  const setVolume = useCallback((vol: number) => {
    try {
      playerRef.current?.setVolume(Math.round(vol * 100))
    } catch {
      // ignore
    }
  }, [])

  const mute = useCallback(() => {
    try {
      playerRef.current?.mute()
    } catch {
      // ignore
    }
  }, [])

  const unMute = useCallback(() => {
    try {
      playerRef.current?.unMute()
    } catch {
      // ignore
    }
  }, [])

  const controls: YouTubeControls = {
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    getState,
    setVolume,
    mute,
    unMute,
  }

  return { containerRef, isReady, controls }
}
