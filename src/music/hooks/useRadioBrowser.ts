import { useState, useCallback, useRef } from "react"
import type { RadioStation } from "../types"

const RADIO_API_BASE = "https://de1.api.radio-browser.info"

interface UseRadioBrowserReturn {
  stations: RadioStation[]
  loading: boolean
  error: string | null
  searchStations: (query: string) => Promise<void>
  getByCountry: (country: string) => Promise<void>
  getByTag: (tag: string) => Promise<void>
  getTopStations: (limit?: number) => Promise<void>
  getByLanguage: (language: string) => Promise<void>
}

export function useRadioBrowser(): UseRadioBrowserReturn {
  const [stations, setStations] = useState<RadioStation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchStations = useCallback(async (url: string) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (requestId !== requestIdRef.current) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RadioStation[] = await res.json()
      if (requestId !== requestIdRef.current) return
      setStations(data)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : "Failed to fetch stations")
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const searchStations = useCallback(
    async (query: string) => {
      await fetchStations(
        `${RADIO_API_BASE}/json/stations/search?name=${encodeURIComponent(query)}&limit=50&order=votes&reverse=true`
      )
    },
    [fetchStations]
  )

  const getByCountry = useCallback(
    async (country: string) => {
      await fetchStations(
        `${RADIO_API_BASE}/json/stations/bycountryexact/${encodeURIComponent(country)}?limit=50&order=votes&reverse=true`
      )
    },
    [fetchStations]
  )

  const getByTag = useCallback(
    async (tag: string) => {
      await fetchStations(
        `${RADIO_API_BASE}/json/stations/bytag/${encodeURIComponent(tag)}?limit=50&order=votes&reverse=true`
      )
    },
    [fetchStations]
  )

  const getTopStations = useCallback(
    async (limit = 30) => {
      await fetchStations(
        `${RADIO_API_BASE}/json/stations/topvote?limit=${limit}`
      )
    },
    [fetchStations]
  )

  const getByLanguage = useCallback(
    async (language: string) => {
      await fetchStations(
        `${RADIO_API_BASE}/json/stations/bylanguage/${encodeURIComponent(language)}?limit=50&order=votes&reverse=true`
      )
    },
    [fetchStations]
  )

  return {
    stations,
    loading,
    error,
    searchStations,
    getByCountry,
    getByTag,
    getTopStations,
    getByLanguage,
  }
}
