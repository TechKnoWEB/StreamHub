// Preserve provider retry instructions instead of turning every HTTP failure
// into another immediate request. Accept both formats defined for Retry-After.
export function parseRetryAfter(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const text = value.trim()
  if (/^\d+$/.test(text)) {
    const milliseconds = Number(text) * 1000
    return Number.isSafeInteger(milliseconds) ? milliseconds : undefined
  }
  if (!/[a-z]/i.test(text)) return undefined
  const date = Date.parse(text)
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined
}

export function providerErrorResponse(error) {
  const status = [429, 503].includes(error.status) ? error.status : 502
  const retryAfter = Number.isFinite(error.retryAfterMs) ? Math.max(1, Math.ceil(error.retryAfterMs / 1000)) : undefined
  return { status, retryAfter, body: {
    error: error instanceof Error ? error.message : 'Provider request failed',
    code: error.code || (error.status ? 'PROVIDER_HTTP_ERROR' : 'PROVIDER_UNAVAILABLE'),
    ...(error.status ? { upstreamStatus: error.status } : {}),
  } }
}

export function createRoutingDiagnostics({ now = Date.now, limit = 60 } = {}) {
  const events = [], counts = Object.create(null)
  return {
    record(event) {
      counts[event.type] = (counts[event.type] || 0) + 1
      // Allowlist fields: never retain URLs, query parameters, headers or bodies.
      const safe = { at: new Date(now()).toISOString() }
      for (const key of ['type','host','kind','address','status','ms','count']) if (event[key] !== undefined) safe[key] = event[key]
      events.push(safe)
      if (events.length > limit) events.shift()
    },
    snapshot: () => ({ counts: { ...counts }, recent: events.map(event => ({ ...event })) }),
  }
}
