import { useState, useCallback, useRef } from "react"
import type { Track } from "../types"

interface UseYouTubeSearchReturn {
  results: Track[]
  loading: boolean
  error: string | null
  search: (query: string) => Promise<void>
}

const HEALTH_KEY = "streamhub-invidious-health"
const CACHE_KEY = "streamhub-youtube-search-cache"
const CACHE_TTL = 24 * 60 * 60 * 1000

type HealthScores = Record<string, number>

function getHealthScores(): HealthScores {
  try {
    return JSON.parse(localStorage.getItem(HEALTH_KEY) || "{}")
  } catch {
    return {}
  }
}

function recordSuccess(instance: string) {
  const scores = getHealthScores()
  scores[instance] = (scores[instance] || 0) + 1
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(scores))
  } catch {
    // ignore
  }
}

function recordFailure(instance: string) {
  const scores = getHealthScores()
  scores[instance] = Math.max((scores[instance] || 0) - 1, -5)
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(scores))
  } catch {
    // ignore
  }
}

function sortByHealth(instances: string[]): string[] {
  const scores = getHealthScores()
  return [...instances].sort((a, b) => (scores[b] || 0) - (scores[a] || 0))
}

interface CachedResult {
  data: Track[]
  timestamp: number
}

function getCachedResults(query: string): Track[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache: Record<string, CachedResult> = JSON.parse(raw)
    const key = query.toLowerCase().trim()
    const entry = cache[key]
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete cache[key]
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setCachedResults(query: string, data: Track[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const cache: Record<string, CachedResult> = raw ? JSON.parse(raw) : {}
    const key = query.toLowerCase().trim()
    cache[key] = { data, timestamp: Date.now() }
    const keys = Object.keys(cache)
    if (keys.length > 50) {
      const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      for (let i = 0; i < keys.length - 50; i++) {
        delete cache[oldest[i]]
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

const INVIDIOUS_INSTANCES = [
  "https://inv.thepixora.com",
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.f5.si",
  "https://yt.chocolatemoo53.com",
]

export function useYouTubeSearch(): UseYouTubeSearchReturn {
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return

    const requestId = ++requestIdRef.current

    const cached = getCachedResults(query)
    if (cached) {
      setResults(cached)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const sorted = sortByHealth(INVIDIOUS_INSTANCES)

    for (const instance of sorted) {
      if (requestId !== requestIdRef.current) return

      try {
        const res = await fetch(
          `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
        )
        if (requestId !== requestIdRef.current) return
        if (!res.ok) {
          recordFailure(instance)
          continue
        }
        const invidiousData = await res.json()

        if (!Array.isArray(invidiousData) || invidiousData.length === 0) {
          recordFailure(instance)
          continue
        }

        const tracks: Track[] = invidiousData
          .filter((item: { type: string }) => item.type === "video")
          .slice(0, 20)
          .map((item: { videoId: string; title: string; author: string; videoThumbnails: { url: string }[] }) => ({
            id: `yt-${item.videoId}`,
            title: item.title || "Unknown",
            artist: item.author || "Unknown Artist",
            thumbnail: item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
            source: "youtube" as const,
            streamUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
            platformUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
          }))

        if (tracks.length > 0) {
          recordSuccess(instance)
          setCachedResults(query, tracks)
          if (requestId !== requestIdRef.current) return
          setResults(tracks)
          setLoading(false)
          return
        }
      } catch {
        recordFailure(instance)
        continue
      }
    }

    if (requestId !== requestIdRef.current) return
    setResults([])
    setError("Search temporarily unavailable. All instances are down. Try again later.")
    setLoading(false)
  }, [])

  return { results, loading, error, search }
}
