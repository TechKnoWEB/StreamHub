import { createContext, useReducer, useRef, useEffect, useCallback, type ReactNode } from "react"
import type { MusicPlayerState, MusicAction, Track } from "./types"
import { useAudioPlayer } from "./hooks/useAudioPlayer"
import type { YouTubeControls } from "./hooks/useYouTubePlayer"

const STORAGE_KEY = "streamhub-music"

function loadPersistedState(): Partial<MusicPlayerState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return {
      volume: data.volume ?? 0.8,
      favorites: data.favorites ?? [],
      favoriteTracks: data.favoriteTracks ?? [],
      recentlyPlayed: data.recentlyPlayed ?? [],
      playlists: data.playlists ?? [],
    }
  } catch {
    return {}
  }
}

let persistTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedPersistState(state: MusicPlayerState) {
  if (persistTimeout) clearTimeout(persistTimeout)
  persistTimeout = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          volume: state.volume,
          favorites: state.favorites,
          favoriteTracks: state.favoriteTracks,
          recentlyPlayed: state.recentlyPlayed,
          playlists: state.playlists,
        })
      )
    } catch {
      // ignore
    }
  }, 300)
}

const persisted = loadPersistedState()

const initialState: MusicPlayerState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: persisted.volume ?? 0.8,
  progress: 0,
  duration: 0,
  isMuted: false,
  isShuffled: false,
  repeatMode: "none",
  favorites: persisted.favorites ?? [],
  favoriteTracks: persisted.favoriteTracks ?? [],
  recentlyPlayed: persisted.recentlyPlayed ?? [],
  playlists: persisted.playlists ?? [],
}

function musicReducer(state: MusicPlayerState, action: MusicAction): MusicPlayerState {
  let next: MusicPlayerState

  switch (action.type) {
    case "SET_TRACK":
      next = { ...state, currentTrack: action.track, isPlaying: true }
      break
    case "PLAY":
      next = { ...state, isPlaying: true }
      break
    case "PAUSE":
      next = { ...state, isPlaying: false }
      break
    case "TOGGLE_PLAY":
      next = { ...state, isPlaying: !state.isPlaying }
      break
    case "SET_VOLUME":
      next = { ...state, volume: action.volume, isMuted: action.volume === 0 }
      break
    case "SET_PROGRESS":
      next = { ...state, progress: action.progress }
      break
    case "SET_DURATION":
      next = { ...state, duration: action.duration }
      break
    case "TOGGLE_MUTE":
      next = { ...state, isMuted: !state.isMuted }
      break
    case "NEXT_TRACK": {
      if (state.queue.length === 0) return state
      const nextIndex = state.isShuffled
        ? Math.floor(Math.random() * state.queue.length)
        : (state.queueIndex + 1) % state.queue.length
      next = {
        ...state,
        queueIndex: nextIndex,
        currentTrack: state.queue[nextIndex],
        isPlaying: true,
        progress: 0,
      }
      break
    }
    case "PREV_TRACK": {
      if (state.queue.length === 0) return state
      const prevIndex = state.queueIndex <= 0 ? state.queue.length - 1 : state.queueIndex - 1
      next = {
        ...state,
        queueIndex: prevIndex,
        currentTrack: state.queue[prevIndex],
        isPlaying: true,
        progress: 0,
      }
      break
    }
    case "ADD_TO_QUEUE": {
      const newQueue = [...state.queue, action.track]
      const shouldAutoPlay = state.currentTrack === null
      next = {
        ...state,
        queue: newQueue,
        queueIndex: shouldAutoPlay ? 0 : state.queueIndex,
        currentTrack: shouldAutoPlay ? action.track : state.currentTrack,
        isPlaying: shouldAutoPlay ? true : state.isPlaying,
      }
      break
    }
    case "ADD_TO_QUEUE_NEXT": {
      if (state.queueIndex < 0) {
        next = { ...state, queue: [action.track], queueIndex: 0, currentTrack: action.track, isPlaying: true }
        break
      }
      const updatedQueue = [...state.queue]
      updatedQueue.splice(state.queueIndex + 1, 0, action.track)
      next = { ...state, queue: updatedQueue }
      break
    }
    case "REMOVE_FROM_QUEUE": {
      const newQueue = state.queue.filter((_, i) => i !== action.index)
      if (newQueue.length === 0) {
        next = {
          ...initialState,
          favorites: state.favorites,
          favoriteTracks: state.favoriteTracks,
          recentlyPlayed: state.recentlyPlayed,
          playlists: state.playlists,
          volume: state.volume,
        }
        break
      }
      let newIndex = state.queueIndex
      if (action.index < state.queueIndex) newIndex = state.queueIndex - 1
      else if (action.index === state.queueIndex) newIndex = Math.min(newIndex, newQueue.length - 1)
      next = { ...state, queue: newQueue, queueIndex: newIndex, currentTrack: newQueue[newIndex] }
      break
    }
    case "CLEAR_QUEUE":
      next = {
        ...initialState,
        favorites: state.favorites,
        favoriteTracks: state.favoriteTracks,
        recentlyPlayed: state.recentlyPlayed,
        playlists: state.playlists,
        volume: state.volume,
      }
      break
    case "SET_QUEUE": {
      const startIndex = action.startIndex ?? 0
      next = {
        ...state,
        queue: action.tracks,
        queueIndex: startIndex,
        currentTrack: action.tracks[startIndex],
        isPlaying: true,
        progress: 0,
      }
      break
    }
    case "SET_QUEUE_INDEX": {
      if (state.queue.length === 0) return state
      const index = Math.max(0, Math.min(action.index, state.queue.length - 1))
      next = {
        ...state,
        queueIndex: index,
        currentTrack: state.queue[index],
        isPlaying: true,
        progress: 0,
      }
      break
    }
    case "TOGGLE_SHUFFLE":
      next = { ...state, isShuffled: !state.isShuffled }
      break
    case "CYCLE_REPEAT": {
      const modes: Array<"none" | "all" | "one"> = ["none", "all", "one"]
      const currentIndex = modes.indexOf(state.repeatMode)
      next = { ...state, repeatMode: modes[(currentIndex + 1) % 3] }
      break
    }
    case "TOGGLE_FAVORITE": {
      const isFav = state.favorites.includes(action.trackId)
      const trackToStore = action.track ?? state.currentTrack ?? state.recentlyPlayed.find((t) => t.id === action.trackId) ?? state.queue.find((t) => t.id === action.trackId)
      next = {
        ...state,
        favorites: isFav ? state.favorites.filter((id) => id !== action.trackId) : [...state.favorites, action.trackId],
        favoriteTracks: isFav
          ? state.favoriteTracks.filter((track) => track.id !== action.trackId)
          : trackToStore && !state.favoriteTracks.some((track) => track.id === action.trackId)
            ? [...state.favoriteTracks, trackToStore]
            : state.favoriteTracks,
      }
      break
    }
    case "ADD_RECENTLY_PLAYED": {
      const filtered = state.recentlyPlayed.filter((t) => t.id !== action.track.id)
      next = { ...state, recentlyPlayed: [action.track, ...filtered].slice(0, 50) }
      break
    }
    case "REMOVE_FROM_RECENTLY_PLAYED": {
      next = { ...state, recentlyPlayed: state.recentlyPlayed.filter((t) => t.id !== action.trackId) }
      break
    }
    case "CREATE_PLAYLIST": {
      const playlist = {
        id: `pl-${Date.now()}`,
        name: action.name,
        tracks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      next = { ...state, playlists: [...state.playlists, playlist] }
      break
    }
    case "DELETE_PLAYLIST":
      next = { ...state, playlists: state.playlists.filter((p) => p.id !== action.id) }
      break
    case "RENAME_PLAYLIST":
      next = {
        ...state,
        playlists: state.playlists.map((p) => (p.id === action.id ? { ...p, name: action.name, updatedAt: Date.now() } : p)),
      }
      break
    case "ADD_TO_PLAYLIST":
      next = {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.playlistId ? { ...p, tracks: [...p.tracks, action.track], updatedAt: Date.now() } : p
        ),
      }
      break
    case "REMOVE_FROM_PLAYLIST":
      next = {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.playlistId
            ? { ...p, tracks: p.tracks.filter((_, i) => i !== action.trackIndex), updatedAt: Date.now() }
            : p
        ),
      }
      break
    case "LOAD_STATE":
      next = { ...state, ...action.state }
      break
    case "RESET":
      next = { ...initialState }
      break
    default:
      return state
  }

  return next
}

interface MusicContextValue {
  state: MusicPlayerState
  dispatch: React.Dispatch<MusicAction>
  playTrack: (track: Track, queue?: Track[]) => void
  togglePlay: () => void
  nextTrack: () => void
  prevTrack: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  addToQueue: (track: Track) => void
  addToQueueNext: (track: Track) => void
  playQueue: (tracks: Track[], startIndex?: number) => void
  toggleFavorite: (track: Track) => void
  isFavorite: (trackId: string) => boolean
  createPlaylist: (name: string) => void
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addToPlaylist: (playlistId: string, track: Track) => void
  removeFromPlaylist: (playlistId: string, trackIndex: number) => void
  registerYouTubeControls: (controls: YouTubeControls) => void
  unregisterYouTubeControls: () => void
  removeFromRecentlyPlayed: (trackId: string) => void
}

export const MusicContext = createContext<MusicContextValue | null>(null)

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(musicReducer, initialState)
  const prevTrackRef = useRef<Track | null>(null)
  const youTubeControlsRef = useRef<YouTubeControls | null>(null)
  const handleTrackEndRef = useRef<(() => void) | null>(null)

  const registerYouTubeControls = useCallback((controls: YouTubeControls) => {
    youTubeControlsRef.current = controls
  }, [])

  const unregisterYouTubeControls = useCallback(() => {
    youTubeControlsRef.current = null
  }, [])

  useEffect(() => {
    debouncedPersistState(state)
  }, [state.volume, state.favorites, state.favoriteTracks, state.recentlyPlayed, state.playlists])

  const handleTrackEnd = useCallback(() => {
    if (state.repeatMode === "one") return
    if (state.repeatMode === "all" || state.queueIndex < state.queue.length - 1) {
      dispatch({ type: "NEXT_TRACK" })
    } else {
      dispatch({ type: "PAUSE" })
    }
  }, [state.repeatMode, state.queueIndex, state.queue.length])

  const {
    isPlaying: audioIsPlaying,
    isMuted: audioMuted,
    loadAndPlay,
    togglePlay: audioToggle,
    seek: audioSeek,
    setVolume: audioSetVolume,
    toggleMute: audioToggleMute,
  } = useAudioPlayer({
    onTrackEnd: handleTrackEnd,
    onTimeUpdate: (time) => dispatch({ type: "SET_PROGRESS", progress: time }),
    onDurationChange: (dur) => dispatch({ type: "SET_DURATION", duration: dur }),
    onError: () => {
      dispatch({ type: "PAUSE" })
    },
  })

  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd
  })

  const seek = useCallback(
    (time: number) => {
      if (state.currentTrack?.source === "youtube" && youTubeControlsRef.current) {
        youTubeControlsRef.current.seekTo(time)
        dispatch({ type: "SET_PROGRESS", progress: time })
      } else {
        audioSeek(time)
      }
    },
    [state.currentTrack, audioSeek]
  )

  useEffect(() => {
    if (state.currentTrack?.source !== "youtube" || !state.isPlaying || !youTubeControlsRef.current) return

    const interval = setInterval(() => {
      const controls = youTubeControlsRef.current
      if (!controls) return
      const time = controls.getCurrentTime()
      const dur = controls.getDuration()
      dispatch({ type: "SET_PROGRESS", progress: time })
      if (dur > 0) dispatch({ type: "SET_DURATION", duration: dur })

      const playerState = controls.getState()
      if (playerState === 0) {
        handleTrackEndRef.current?.()
      }
    }, 500)

    return () => clearInterval(interval)
  }, [state.currentTrack, state.isPlaying])

  useEffect(() => {
    if (!("mediaSession" in navigator)) return

    const track = state.currentTrack
    if (!track) {
      navigator.mediaSession.metadata = null
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: track.thumbnail
        ? [{ src: track.thumbnail, sizes: "512x512", type: "image/jpeg" }]
        : [],
    })

    navigator.mediaSession.setActionHandler("play", () => {
      if (track.source === "radio") audioToggle()
      else if (track.source === "youtube" && youTubeControlsRef.current) youTubeControlsRef.current.play()
      dispatch({ type: "PLAY" })
    })

    navigator.mediaSession.setActionHandler("pause", () => {
      if (track.source === "radio") audioToggle()
      else if (track.source === "youtube" && youTubeControlsRef.current) youTubeControlsRef.current.pause()
      dispatch({ type: "PAUSE" })
    })

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      dispatch({ type: "PREV_TRACK" })
    })

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      dispatch({ type: "NEXT_TRACK" })
    })

    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const offset = details.seekOffset ?? 10
      const time = track.source === "youtube" && youTubeControlsRef.current ? youTubeControlsRef.current.getCurrentTime() : state.progress
      seek(Math.max(time - offset, 0))
    })

    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const offset = details.seekOffset ?? 10
      const time = track.source === "youtube" && youTubeControlsRef.current ? youTubeControlsRef.current.getCurrentTime() : state.progress
      seek(Math.min(time + offset, state.duration))
    })

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) {
        seek(details.seekTime)
      }
    })

    return () => {
      if (!("mediaSession" in navigator)) return
      navigator.mediaSession.setActionHandler("play", null)
      navigator.mediaSession.setActionHandler("pause", null)
      navigator.mediaSession.setActionHandler("previoustrack", null)
      navigator.mediaSession.setActionHandler("nexttrack", null)
      navigator.mediaSession.setActionHandler("seekbackward", null)
      navigator.mediaSession.setActionHandler("seekforward", null)
      navigator.mediaSession.setActionHandler("seekto", null)
    }
  }, [state.currentTrack, state.progress, state.duration])

  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    navigator.mediaSession.playbackState = state.isPlaying ? "playing" : "paused"
  }, [state.isPlaying])

  useEffect(() => {
    if (state.currentTrack && state.currentTrack !== prevTrackRef.current) {
      prevTrackRef.current = state.currentTrack
      if (state.currentTrack.source === "radio") {
        loadAndPlay(state.currentTrack.streamUrl)
      }
      dispatch({ type: "ADD_RECENTLY_PLAYED", track: state.currentTrack })
    }
  }, [state.currentTrack, loadAndPlay])

  useEffect(() => {
    if (state.currentTrack?.source === "radio") {
      if (state.isPlaying && !audioIsPlaying) audioToggle()
      else if (!state.isPlaying && audioIsPlaying) audioToggle()
    }
  }, [state.isPlaying, audioIsPlaying, state.currentTrack, audioToggle])

  useEffect(() => {
    audioSetVolume(state.volume)
  }, [state.volume, audioSetVolume])

  useEffect(() => {
    if (state.currentTrack?.source === "radio" && audioMuted !== state.isMuted) {
      audioToggleMute()
    }
  }, [state.isMuted, audioMuted, audioToggleMute, state.currentTrack])

  useEffect(() => {
    if (state.currentTrack?.source === "youtube" && youTubeControlsRef.current) {
      if (state.isMuted) youTubeControlsRef.current.mute()
      else youTubeControlsRef.current.unMute()
    }
  }, [state.isMuted, state.currentTrack])

  const nextTrack = useCallback(() => dispatch({ type: "NEXT_TRACK" }), [])
  const prevTrack = useCallback(() => dispatch({ type: "PREV_TRACK" }), [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return

      switch (e.code) {
        case "Space": {
          e.preventDefault()
          if (!state.currentTrack) break
          if (state.currentTrack.source === "radio") {
            audioToggle()
          } else if (state.currentTrack.source === "youtube" && youTubeControlsRef.current) {
            if (state.isPlaying) youTubeControlsRef.current.pause()
            else youTubeControlsRef.current.play()
          }
          dispatch({ type: "TOGGLE_PLAY" })
          break
        }
        case "ArrowRight":
          if (e.shiftKey) nextTrack()
          else seek(Math.min(state.progress + 10, state.duration))
          break
        case "ArrowLeft":
          if (e.shiftKey) prevTrack()
          else seek(Math.max(state.progress - 10, 0))
          break
        case "ArrowUp": {
          e.preventDefault()
          const newVol = Math.min(state.volume + 0.05, 1)
          if (state.currentTrack?.source === "youtube" && youTubeControlsRef.current) {
            youTubeControlsRef.current.setVolume(newVol)
          }
          audioSetVolume(newVol)
          dispatch({ type: "SET_VOLUME", volume: newVol })
          break
        }
        case "ArrowDown": {
          e.preventDefault()
          const newVol = Math.max(state.volume - 0.05, 0)
          if (state.currentTrack?.source === "youtube" && youTubeControlsRef.current) {
            youTubeControlsRef.current.setVolume(newVol)
          }
          audioSetVolume(newVol)
          dispatch({ type: "SET_VOLUME", volume: newVol })
          break
        }
        case "KeyM":
          dispatch({ type: "TOGGLE_MUTE" })
          break
        case "KeyS":
          dispatch({ type: "TOGGLE_SHUFFLE" })
          break
        case "KeyR":
          dispatch({ type: "CYCLE_REPEAT" })
          break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [state, audioToggle, nextTrack, prevTrack, seek, audioSetVolume])

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    if (queue) {
      const startIndex = queue.findIndex((t) => t.id === track.id)
      dispatch({ type: "SET_QUEUE", tracks: queue, startIndex: startIndex >= 0 ? startIndex : 0 })
    } else {
      dispatch({ type: "SET_TRACK", track })
    }
  }, [])

  const addToQueue = useCallback((track: Track) => dispatch({ type: "ADD_TO_QUEUE", track }), [])
  const addToQueueNext = useCallback((track: Track) => dispatch({ type: "ADD_TO_QUEUE_NEXT", track }), [])
  const playQueue = useCallback((tracks: Track[], startIndex?: number) => dispatch({ type: "SET_QUEUE", tracks, startIndex }), [])
  const toggleFavorite = useCallback((track: Track) => dispatch({ type: "TOGGLE_FAVORITE", trackId: track.id, track }), [])
  const isFavorite = useCallback((trackId: string) => state.favorites.includes(trackId), [state.favorites])
  const createPlaylist = useCallback((name: string) => dispatch({ type: "CREATE_PLAYLIST", name }), [])
  const deletePlaylist = useCallback((id: string) => dispatch({ type: "DELETE_PLAYLIST", id }), [])
  const renamePlaylist = useCallback((id: string, name: string) => dispatch({ type: "RENAME_PLAYLIST", id, name }), [])
  const addToPlaylist = useCallback((playlistId: string, track: Track) => dispatch({ type: "ADD_TO_PLAYLIST", playlistId, track }), [])
  const removeFromPlaylist = useCallback((playlistId: string, trackIndex: number) => dispatch({ type: "REMOVE_FROM_PLAYLIST", playlistId, trackIndex }), [])
  const removeFromRecentlyPlayed = useCallback((trackId: string) => dispatch({ type: "REMOVE_FROM_RECENTLY_PLAYED", trackId }), [])

  return (
    <MusicContext.Provider
      value={{
        state,
        dispatch,
        playTrack,
        togglePlay: () => {
          if (state.currentTrack?.source === "radio") {
            audioToggle()
          } else if (state.currentTrack?.source === "youtube" && youTubeControlsRef.current) {
            if (state.isPlaying) youTubeControlsRef.current.pause()
            else youTubeControlsRef.current.play()
          }
          dispatch({ type: "TOGGLE_PLAY" })
        },
        nextTrack,
        prevTrack,
        seek,
        setVolume: (vol: number) => {
          if (state.currentTrack?.source === "youtube" && youTubeControlsRef.current) {
            youTubeControlsRef.current.setVolume(vol)
          }
          dispatch({ type: "SET_VOLUME", volume: vol })
        },
        toggleMute: () => dispatch({ type: "TOGGLE_MUTE" }),
        addToQueue,
        addToQueueNext,
        playQueue,
        toggleFavorite,
        isFavorite,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        removeFromRecentlyPlayed,
        registerYouTubeControls,
        unregisterYouTubeControls,
      }}
    >
      {children}
    </MusicContext.Provider>
  )
}
