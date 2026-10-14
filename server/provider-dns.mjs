import net from 'node:net'

export function publicIPv4(address) {
  if (net.isIP(address) !== 4) return false
  const [a, b] = address.split('.').map(Number)
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127))
}

export function createPublicResolver({ fetch: fetchDNS = fetch } = {}) {
  return async (host) => {
    const endpoints = ['https://dns.google/resolve', 'https://cloudflare-dns.com/dns-query']
    const results = await Promise.allSettled(endpoints.map(async (endpoint) => {
      const response = await fetchDNS(`${endpoint}?name=${encodeURIComponent(host)}&type=A`, {
        headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(3000),
      })
      if (!response.ok) throw new Error('DNS service unavailable')
      const data = await response.json()
      if (data.Status !== 0) throw new Error('Provider DNS lookup failed')
      return (data.Answer || []).filter((r) => r.type === 1 && publicIPv4(r.data))
        .map((r) => ({ address: r.data, ttl: Math.max(1, Math.min(Number(r.TTL) || 60, 300)) }))
    }))
    const unique = new Map()
    for (const result of results) if (result.status === 'fulfilled') {
      for (const record of result.value) {
        const existing = unique.get(record.address)
        unique.set(record.address, { ...record, ttl: Math.min(existing?.ttl ?? 300, record.ttl) })
      }
    }
    if (!unique.size) throw new Error('No public provider address from either DNS service')
    return [...unique.values()]
  }
}
