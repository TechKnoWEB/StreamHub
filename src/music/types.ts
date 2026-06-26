export type MusicSource = "youtube" | "radio"

export interface Track {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration?: string
  source: MusicSource
  streamUrl: string
  platformUrl?: string
  codec?: string
  bitrate?: number
  country?: string
}

export interface RadioStation {
  stationuuid: string
  name: string
  url_resolved: string
  homepage: string
  favicon: string
  tags: string
  country: string
  countrycode: string
  language: string
  codec: string
  bitrate: number
  votes: number
  lastchangetime: string
}

export interface MusicPlaylist {
  id: string
  name: string
  tracks: Track[]
  createdAt: number
  updatedAt: number
}

export interface MusicPlayerState {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  isMuted: boolean
  isShuffled: boolean
  repeatMode: "none" | "all" | "one"
  favorites: string[]
  recentlyPlayed: Track[]
  playlists: MusicPlaylist[]
}

export type MusicAction =
  | { type: "SET_TRACK"; track: Track }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "SET_DURATION"; duration: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "NEXT_TRACK" }
  | { type: "PREV_TRACK" }
  | { type: "ADD_TO_QUEUE"; track: Track }
  | { type: "ADD_TO_QUEUE_NEXT"; track: Track }
  | { type: "REMOVE_FROM_QUEUE"; index: number }
  | { type: "CLEAR_QUEUE" }
  | { type: "SET_QUEUE"; tracks: Track[]; startIndex?: number }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "CYCLE_REPEAT" }
  | { type: "TOGGLE_FAVORITE"; trackId: string }
  | { type: "ADD_RECENTLY_PLAYED"; track: Track }
  | { type: "REMOVE_FROM_RECENTLY_PLAYED"; trackId: string }
  | { type: "CREATE_PLAYLIST"; name: string }
  | { type: "DELETE_PLAYLIST"; id: string }
  | { type: "RENAME_PLAYLIST"; id: string; name: string }
  | { type: "ADD_TO_PLAYLIST"; playlistId: string; track: Track }
  | { type: "REMOVE_FROM_PLAYLIST"; playlistId: string; trackIndex: number }
  | { type: "LOAD_STATE"; state: Partial<MusicPlayerState> }
  | { type: "RESET" }
