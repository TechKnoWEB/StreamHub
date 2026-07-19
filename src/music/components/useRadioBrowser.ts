import { useState, useCallback, useRef } from "react"
import type { RadioStation } from "../types"

const SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
]

const REQUEST_TIMEOUT = 8000
const CACHE_TTL = 60_000

interface CacheEntry {
  data: RadioStation[]
  expiry: number
}

const responseCache = new Map<string, CacheEntry>()

function getCached(key: string): RadioStation[] | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    responseCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: RadioStation[]) {
  responseCache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

async function findBestServer(): Promise<string> {
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}/json/stats`, { signal: AbortSignal.timeout(4000) })
      if (res.ok) return server
    } catch {
      continue
    }
  }
  return SERVERS[0]
}

let cachedServer: string | null = null

async function getBaseUrl(): Promise<string> {
  if (cachedServer) return cachedServer
  cachedServer = await findBestServer()
  return cachedServer
}

function buildCacheKey(endpoint: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString()
  return `${endpoint}?${qs}`
}

interface UseRadioBrowserReturn {
  stations: RadioStation[]
  loading: boolean
  error: string | null
  hasMore: boolean
  searchStations: (query: string) => Promise<void>
  getByCountry: (country: string) => Promise<void>
  getByTag: (tag: string) => Promise<void>
  getTopStations: (limit?: number) => Promise<void>
  getByLanguage: (language: string) => Promise<void>
  loadMore: () => Promise<void>
  retry: () => Promise<void>
}

export function useRadioBrowser(): UseRadioBrowserReturn {
  const [stations, setStations] = useState<RadioStation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const requestIdRef = useRef(0)
  const lastRequestRef = useRef<{ endpoint: string; params: Record<string, string>; offset: number } | null>(null)

  const fetchStations = useCallback(async (endpoint: string, params: Record<string, string>, append = false) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    const cacheKey = buildCacheKey(endpoint, params)
    if (!append) {
      const cached = getCached(cacheKey)
      if (cached) {
        setStations(cached)
        setHasMore(cached.length >= parseInt(params.limit || "50"))
        setLoading(false)
        return
      }
    }

    try {
      const baseUrl = await getBaseUrl()
      const qs = new URLSearchParams(params).toString()
      const url = `${baseUrl}${endpoint}?${qs}`

      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
      if (requestId !== requestIdRef.current) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: RadioStation[] = await res.json()
      if (requestId !== requestIdRef.current) return

      if (append) {
        setStations((prev) => [...prev, ...data])
      } else {
        setStations(data)
        setCache(cacheKey, data)
      }

      const limit = parseInt(params.limit || "50")
      setHasMore(data.length >= limit)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      if (err instanceof DOMException && err.name === "TimeoutError") {
        setError("Request timed out. Please try again.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch stations")
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const searchStations = useCallback(
    async (query: string) => {
      const endpoint = `/json/stations/search`
      const params = { name: encodeURIComponent(query), limit: "50", order: "votes", reverse: "true" }
      lastRequestRef.current = { endpoint, params, offset: 0 }
      await fetchStations(endpoint, params, false)
    },
    [fetchStations]
  )

  const getByCountry = useCallback(
    async (country: string) => {
      const endpoint = `/json/stations/bycountryexact/${encodeURIComponent(country)}`
      const params = { limit: "50", order: "votes", reverse: "true" }
      lastRequestRef.current = { endpoint, params, offset: 0 }
      await fetchStations(endpoint, params, false)
    },
    [fetchStations]
  )

  const getByTag = useCallback(
    async (tag: string) => {
      const endpoint = `/json/stations/bytag/${encodeURIComponent(tag)}`
      const params = { limit: "50", order: "votes", reverse: "true" }
      lastRequestRef.current = { endpoint, params, offset: 0 }
      await fetchStations(endpoint, params, false)
    },
    [fetchStations]
  )

  const getTopStations = useCallback(
    async (limit = 30) => {
      const endpoint = `/json/stations/topvote`
      const params = { limit: String(limit) }
      lastRequestRef.current = { endpoint, params, offset: 0 }
      await fetchStations(endpoint, params, false)
    },
    [fetchStations]
  )

  const getByLanguage = useCallback(
    async (language: string) => {
      const endpoint = `/json/stations/bylanguage/${encodeURIComponent(language)}`
      const params = { limit: "50", order: "votes", reverse: "true" }
      lastRequestRef.current = { endpoint, params, offset: 0 }
      await fetchStations(endpoint, params, false)
    },
    [fetchStations]
  )

  const loadMore = useCallback(async () => {
    if (!lastRequestRef.current || loading) return
    const { endpoint, params, offset } = lastRequestRef.current
    const newOffset = offset + parseInt(params.limit || "50")
    const newParams = { ...params, offset: String(newOffset) }
    lastRequestRef.current = { endpoint, params: newParams, offset: newOffset }
    await fetchStations(endpoint, newParams, true)
  }, [fetchStations, loading])

  const retry = useCallback(async () => {
    if (!lastRequestRef.current) return
    const { endpoint, params, offset } = lastRequestRef.current
    await fetchStations(endpoint, params, offset > 0)
  }, [fetchStations])

  return {
    stations,
    loading,
    error,
    hasMore,
    searchStations,
    getByCountry,
    getByTag,
    getTopStations,
    getByLanguage,
    loadMore,
    retry,
  }
}
