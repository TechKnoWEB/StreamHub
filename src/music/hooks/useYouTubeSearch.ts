import { useState, useCallback } from "react"
import type { Track } from "../types"

interface UseYouTubeSearchReturn {
  results: Track[]
  loading: boolean
  error: string | null
  search: (query: string) => Promise<void>
}

export function useYouTubeSearch(): UseYouTubeSearchReturn {
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)

    const invidiousInstances = [
      "https://inv.thepixora.com",
      "https://invidious.nerdvpn.de",
      "https://inv.nadeko.net",
      "https://invidious.f5.si",
      "https://yt.chocolatemoo53.com",
    ]

    for (const instance of invidiousInstances) {
      try {
        const res = await fetch(
          `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
        )
        if (!res.ok) continue
        const invidiousData = await res.json()

        if (!Array.isArray(invidiousData) || invidiousData.length === 0) continue

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
          setResults(tracks)
          setLoading(false)
          return
        }
      } catch {
        continue
      }
    }

    setResults([])
    setError("Search temporarily unavailable. All instances are down. Try again later.")
    setLoading(false)
  }, [])

  return { results, loading, error, search }
}
