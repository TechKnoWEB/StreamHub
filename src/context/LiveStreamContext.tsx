import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface LiveMatch {
  id: string
  title: string
  category: string
  embedUrl: string
  teams: {
    home: { name: string; badge: string }
    away: { name: string; badge: string }
  }
  source: string
  viewers: number
}

interface LiveStreamContextType {
  liveMatch: LiveMatch | null
  setLiveMatch: (match: LiveMatch | null) => void
}

const LiveStreamContext = createContext<LiveStreamContextType>({
  liveMatch: null,
  setLiveMatch: () => {},
})

export function LiveStreamProvider({ children }: { children: ReactNode }) {
  const [liveMatch, setLiveMatchState] = useState<LiveMatch | null>(null)

  const setLiveMatch = useCallback((match: LiveMatch | null) => {
    setLiveMatchState(match)
  }, [])

  return (
    <LiveStreamContext.Provider value={{ liveMatch, setLiveMatch }}>
      {children}
    </LiveStreamContext.Provider>
  )
}

export const useLiveStream = () => useContext(LiveStreamContext)
