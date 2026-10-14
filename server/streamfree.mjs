import https from 'node:https'
import dns from 'node:dns'
import { createPublicResolver, publicIPv4 } from './provider-dns.mjs'
import { createProviderTransport } from './provider-transport.mjs'
import { parseRetryAfter, providerErrorResponse, createRoutingDiagnostics } from './provider-policy.mjs'

const playerCache = new Map()
const MAX_BODY = 24 * 1024 * 1024
const PROVIDERS = new Set(['streamfree.top', 'strmfree.st'])

export function allowedURL(value, kind = 'media') {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Invalid provider URL')
  const provider = PROVIDERS.has(url.hostname)
  const cdn = /^cdn\d+\.streamfree\.top$/.test(url.hostname)
  const validPath = kind === 'embed'
    ? /^\/embed\/[a-z0-9-]+\/[a-z0-9_-]+$/i.test(url.pathname)
    : /^\/(live|live-cdn)\/[a-z0-9_-]+\/[a-z0-9_.-]+$/i.test(url.pathname)
  if (!(provider || (kind === 'media' && cdn)) || !validPath) throw new Error('Unsupported provider URL')
  return url
}

// Keep connection pools separate per destination IP: a pooled socket for the
// same hostname must not silently defeat a failover to another address.
const agents = new Map()
function agentFor(host, address) {
  const key = `${host}/${address || 'system'}`
  if (!agents.has(key)) {
    if (agents.size >= 64) {
      const oldest = agents.keys().next().value
      agents.get(oldest).destroy()
      agents.delete(oldest)
    }
    agents.set(key, new https.Agent({ keepAlive: true, maxSockets: 6, maxFreeSockets: 2, timeout: 30_000 }))
  }
  return agents.get(key)
}

function request(url, address, timeout = 8000, signal) {
  return new Promise((resolve, reject) => {
    let timer
    const lookup = (_host, options, callback) => {
      const finish = (err, addresses) => {
        const records = (addresses || []).filter((r) => publicIPv4(r.address))
        if (err || !records.length) return callback(err || new Error('No public provider address'))
        if (options?.all) callback(null, records)
        else callback(null, records[0].address, 4)
      }
      if (address) finish(null, [{ address, family: 4 }])
      else dns.lookup(url.hostname, { all: true, family: 4 }, finish)
    }
    const req = https.get(url, {
      lookup, signal, agent: agentFor(url.hostname, address),
      headers: { Accept: '*/*', 'User-Agent': 'StreamHub/1.0', ...(/^\/(live|live-cdn)\//.test(url.pathname) ? { Referer: 'https://strmfree.st/', Origin: 'https://strmfree.st' } : {}) },
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        const error = Object.assign(new Error(`Provider HTTP ${res.statusCode} (${url.hostname}${url.pathname})`), { status: res.statusCode, retryAfterMs: parseRetryAfter(res.headers['retry-after']) })
        clearTimeout(timer)
        reject(error)
        res.destroy()
        return
      }
      const chunks = []
      let length = 0
      res.on('data', (chunk) => {
        length += chunk.length
        if (length > MAX_BODY) req.destroy(new Error('Provider response too large'))
        else chunks.push(chunk)
      })
      res.on('error', (error) => { clearTimeout(timer); reject(error) })
      res.on('end', () => {
        clearTimeout(timer)
        if (res.statusCode < 200 || res.statusCode >= 300) reject(Object.assign(new Error(`Provider HTTP ${res.statusCode} (${url.hostname}${url.pathname})`), { status: res.statusCode }))
        else resolve({ body: Buffer.concat(chunks), type: res.headers['content-type'] || 'application/octet-stream' })
      })
    })
    timer = setTimeout(() => req.destroy(new Error('Provider connection timed out')), timeout)
    req.on('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

// Provider-scoped public DNS fallback; hostname/certificate validation stays on.
const routingDiagnostics = createRoutingDiagnostics()
const transport = createProviderTransport({
  onEvent: routingDiagnostics.record,
  request,
  resolve: createPublicResolver(),
})

export async function fetchProvider(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !(PROVIDERS.has(url.hostname) || /^cdn\d+\.streamfree\.top$/.test(url.hostname))) throw new Error('Unsupported provider host')
  return transport(url)
}

export function parsePlayer(html) {
  const quality = html.match(/const QUALITY = '([a-z0-9]+)'/)?.[1]
  const suffix = html.match(/const SOURCE_SUFFIX = '([0-9]*)'/)?.[1]
  const key = html.match(/const VARIANT = '([a-z0-9_-]+)'\s*\+ QUALITY/)?.[1]
  const data = html.match(/const _0x = (\{[^\n]+\});/)?.[1]
  if (!quality || suffix === undefined || !key || !data) throw new Error('Provider player format changed')
  const signed = JSON.parse(data)[quality]
  if (!signed || typeof signed._t !== 'string' || typeof signed._n !== 'string' || !Number.isFinite(signed._e)) throw new Error('Provider did not issue a playback URL')
  return { key, variant: key + quality + suffix, signed }
}

async function playlistURL(embed, refresh = false) {
  const url = allowedURL(embed, 'embed')
  const cached = playerCache.get(url.href)
  if (!refresh && cached && cached.expires > Date.now()) return cached.url
  const page = await fetchProvider(url)
  const { key, variant, signed } = parsePlayer(page.body.toString('utf8'))
  const routing = JSON.parse((await fetchProvider(new URL(`/get-stream-key/${key}`, url))).body.toString('utf8'))
  if (routing.is_external) throw new Error('This channel requires its external player')
  const prefix = routing.server_name && routing.server_name !== 'origin' ? 'live-cdn' : 'live'
  const playlist = new URL(`/${prefix}/${variant}/index.m3u8`, url)
  for (const name of ['_t', '_e', '_n']) playlist.searchParams.set(name, String(signed[name]))
  const expires = Math.min(Date.now() + 300_000, signed._e * 1000 - 30_000)
  if (playerCache.size >= 100) playerCache.delete(playerCache.keys().next().value)
  playerCache.set(url.href, { url: playlist, expires })
  return playlist
}

export function rewritePlaylist(body, base) {
  const proxy = (value) => `/api/streamfree?action=media&url=${encodeURIComponent(allowedURL(new URL(value, base)).href)}`
  return body
    .replace(/URI="([^"]*)"/g, (_, value) => `URI="${proxy(value)}"`)
    .replace(/^(?!#)(.+)$/gm, (line) => line.trim() ? proxy(line.trim()) : line)
}

export async function streamfreeHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') { res.statusCode = 405; res.end('GET required'); return }
  const query = new URL(req.url, 'http://localhost').searchParams
  const action = query.get('action') || 'catalog'
  try {
    if (action === 'health') {
      const address = req.socket?.remoteAddress
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) { res.statusCode = 403; res.end('Local diagnostics only'); return }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(routingDiagnostics.snapshot()))
    } else if (action === 'catalog') {
      const category = query.get('category') || 'cricket'
      if (!/^[a-z-]{1,30}$/.test(category)) throw new Error('Invalid category')
      const result = await fetchProvider(`https://streamfree.top/api/v1/streams?category=${category}`)
      const data = JSON.parse(result.body.toString('utf8'))
      if (!Array.isArray(data.streams)) throw new Error('Provider catalog format changed')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    } else if (action === 'playlist' || action === 'media') {
      let target = action === 'playlist' ? await playlistURL(query.get('embed') || '') : allowedURL(query.get('url') || '')
      let result
      try { result = await fetchProvider(target) }
      catch (error) {
        if (action !== 'playlist' || ![401, 403].includes(error.status)) throw error
        // Signed playback URLs can be revoked before their advertised expiry.
        target = await playlistURL(query.get('embed') || '', true)
        result = await fetchProvider(target)
      }
      if (target.pathname.endsWith('.m3u8')) {
        const text = result.body.toString('utf8')
        if (!text.startsWith('#EXTM3U')) throw new Error('Provider did not return an HLS playlist')
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
        res.end(rewritePlaylist(text, target))
      } else {
        res.setHeader('Content-Type', result.type)
        res.end(result.body)
      }
    } else {
      res.statusCode = 400
      res.end('Unknown action')
    }
  } catch (error) {
    const failure = providerErrorResponse(error)
    res.statusCode = failure.status
    res.setHeader('Content-Type', 'application/json')
    if (failure.retryAfter !== undefined) res.setHeader('Retry-After', String(failure.retryAfter))
    res.end(JSON.stringify(failure.body))
  }
}
