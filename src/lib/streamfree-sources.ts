export function streamFreeSources(raw: { sources?: unknown; embed_url?: unknown }): string[] {
  const values = Array.isArray(raw.sources) ? raw.sources : []
  const candidates = [...values, raw.embed_url]
  const urls: string[] = []
  for (const item of candidates) {
    const value = typeof item === 'string' ? item : (item && typeof item === 'object' && 'url' in item ? item.url : null)
    if (typeof value !== 'string') continue
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' && !url.username && !url.password && !urls.includes(url.href)) urls.push(url.href)
    } catch { /* Skip malformed source entries. */ }
  }
  return urls
}

export function streamFreePlayerURL(embed: string): string {
  const url = new URL(embed)
  if (['strmfree.st', 'streamfree.top'].includes(url.hostname) && /^\/embed\/[a-z0-9-]+\/[a-z0-9_-]+$/i.test(url.pathname)) {
    return `/api/streamfree?action=playlist&embed=${encodeURIComponent(url.href)}`
  }
  return embed
}

export function isHlsSource(src: string): boolean {
  try {
    const url = new URL(src, 'http://localhost')
    return /\.m3u8$/i.test(url.pathname) || (url.pathname === '/api/streamfree' && url.searchParams.get('action') === 'playlist')
  } catch { return false }
}
