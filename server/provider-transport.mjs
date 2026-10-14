// Resolve only provider-owned hosts. Rank their DNS-published IPs by health,
// hedge a slow GET against a second IP, and cancel the losing download.
export function createProviderTransport({ request, resolve, now = Date.now,
  budgetMs = 14_000, attemptMs = 9_000, hedgeMs = 1_200, onEvent = () => {}, maxInflight = 64 } = {}) {
  const cache = new Map(), fallbackHosts = new Set(), pendingDNS = new Map()
  const inflight = new Map(), health = new Map(), forcedRefreshAt = new Map(), pauses = new Map()
  const emit = (event) => { try { onEvent(event) } catch { /* Diagnostics cannot break playback. */ } }
  const pauseError = (host) => {
    const pause = pauses.get(host)
    if (!pause) return
    if (pause.until <= now()) { pauses.delete(host); return }
    return Object.assign(new Error('Provider requested a retry delay'), { status: pause.status, code: 'PROVIDER_BACKOFF', retryAfterMs: pause.until - now() })
  }
  const rememberPause = (host, error) => {
    if (error.status !== 429 && !(error.status === 503 && Number.isFinite(error.retryAfterMs))) return false
    const delay = Math.max(1000, error.retryAfterMs ?? 30_000)
    const until = Math.max(pauses.get(host)?.until || 0, now() + delay)
    pauses.set(host, { until, status: error.status })
    error.retryAfterMs = until - now()
    error.code = 'PROVIDER_BACKOFF'
    emit({ type: 'provider_backoff', host, status: error.status, ms: error.retryAfterMs })
    return true
  }
  const retryable = (error) => !error.status || error.status === 408 || error.status >= 500
  const kindFor = (url) => /^\/(live|live-cdn)\//.test(url.pathname) && !url.pathname.endsWith('.m3u8') ? 'media' : 'control'
  const keyFor = (host, address, kind) => `${host}/${address}/${kind}`
  const stateFor = (host, address, kind) => health.get(keyFor(host, address, kind)) || { failures: 0, until: 0, latency: Infinity }

  async function refresh(host) {
    if (pendingDNS.has(host)) return pendingDNS.get(host)
    const task = resolve(host).then((records) => {
      records = [...new Map(records.map((r) => [r.address, r])).values()]
      if (!records.length) throw new Error('No public provider address')
      const entry = { records, expires: now() + Math.min(...records.map((r) => r.ttl || 60), 300) * 1000, updated: now() }
      cache.set(host, entry)
      emit({ type: 'dns_refresh', host, count: records.length })
      // Do not retain or retry addresses removed from the current DNS answer.
      for (const key of health.keys()) if (key.startsWith(`${host}/`) && !records.some((r) => key.startsWith(`${host}/${r.address}/`))) health.delete(key)
      return entry
    }).catch((error) => { emit({ type: 'dns_refresh_failed', host }); throw error }).finally(() => pendingDNS.delete(host))
    pendingDNS.set(host, task)
    return task
  }

  function tryAddresses(url, records, deadline, attempted) {
    const host = url.hostname, kind = kindFor(url)
    const paused = pauseError(host)
    if (paused) return Promise.reject(paused)
    if (now() >= deadline) return Promise.reject(new Error('Provider request deadline exceeded'))
    const candidates = records.filter((r) => !attempted.has(r.address) && stateFor(host, r.address, kind).until <= now())
      .sort((a, b) => {
        const x = stateFor(host, a.address, kind), y = stateFor(host, b.address, kind)
        return x.failures - y.failures || x.latency - y.latency
      }).slice(0, Math.max(0, 3 - attempted.size))
    if (!candidates.length) return Promise.reject(Object.assign(new Error('Provider IPs are temporarily unavailable; retry shortly'), { code: 'PROVIDER_COOLDOWN' }))
    return new Promise((resolveResult, rejectResult) => {
      let done = false, active = 0, next = 0, hedgeTimer, deadlineTimer, lastError
      const controllers = new Set()
      const finish = (error, value) => {
        if (done) return
        done = true
        clearTimeout(hedgeTimer); clearTimeout(deadlineTimer)
        for (const controller of controllers) controller.abort()
        if (error) rejectResult(error); else resolveResult(value)
      }
      const launch = () => {
        if (done || active >= 2 || next >= candidates.length) return
        const paused = pauseError(host)
        if (paused) { finish(paused); return }
        const { address } = candidates[next++]
        const controller = new AbortController()
        controllers.add(controller); attempted.add(address); active++
        const started = now()
        Promise.resolve().then(() => request(url, address, Math.max(1, Math.min(attemptMs, deadline - now())), controller.signal))
          .then((value) => {
            if (done) return
            const state = stateFor(host, address, kind), elapsed = Math.max(1, now() - started)
            health.set(keyFor(host, address, kind), { failures: 0, until: 0, latency: Number.isFinite(state.latency) ? state.latency * .7 + elapsed * .3 : elapsed })
            emit({ type: 'route_success', host, kind, address, ms: elapsed })
            controllers.delete(controller) // Keep the successful connection reusable.
            finish(null, value)
          }, (error) => {
            if (done) return // An aborted loser is not an unhealthy address.
            lastError = error
            emit({ type: 'route_failure', host, kind, address, status: error.status, ms: now() - started })
            if (rememberPause(host, error) || !retryable(error)) { finish(error); return }
            const state = stateFor(host, address, kind), failures = state.failures + 1
            health.set(keyFor(host, address, kind), { ...state, failures, until: now() + Math.min(60_000, 5000 * 2 ** Math.min(failures - 1, 4)) })
          }).finally(() => {
            controllers.delete(controller); active--
            if (done) return
            if (next < candidates.length) launch()
            else if (!active) finish(lastError || new Error('No provider address responded'))
          })
      }
      deadlineTimer = setTimeout(() => finish(new Error('Provider request deadline exceeded')), Math.max(1, deadline - now()))
      launch()
      hedgeTimer = setTimeout(launch, hedgeMs)
    })
  }

  function beforeDeadline(task, deadline, onTimeout = () => {}) {
    let timer
    const limit = new Promise((_resolve, reject) => {
      timer = setTimeout(() => { onTimeout(); reject(new Error('Provider request deadline exceeded')) }, Math.max(1, deadline - now()))
    })
    return Promise.race([task, limit]).finally(() => clearTimeout(timer))
  }

  async function fetchWithFallback(url) {
    const host = url.hostname, kind = kindFor(url), deadline = now() + budgetMs
    const paused = pauseError(host)
    if (paused) throw paused
    let entry = cache.get(host)
    if (!fallbackHosts.has(host)) {
      const controller = new AbortController()
      const timeout = Math.min(2500, budgetMs)
      try { return await beforeDeadline(request(url, undefined, timeout, controller.signal), now() + timeout, () => controller.abort()) }
      catch (error) {
        if (rememberPause(host, error) || !retryable(error) || now() >= deadline) throw error
        fallbackHosts.add(host)
        emit({ type: 'system_dns_fallback', host })
      }
    }
    // Refresh a still-valid route in the background before TTL expiry. Requests
    // continue using the valid answer while the shared refresh is in progress.
    if (entry && entry.expires > now() && entry.expires - now() <= 30_000 && now() - (forcedRefreshAt.get(host) ?? -Infinity) >= 15_000) {
      forcedRefreshAt.set(host, now())
      void refresh(host).catch(() => {})
    }
    if (!entry || entry.expires <= now()) {
      try { entry = await beforeDeadline(refresh(host), deadline) }
      catch (error) {
        if (!entry || now() - entry.updated > 900_000) throw error
      }
    }
    const attempted = new Set()
    try { return await tryAddresses(url, entry.records, deadline, attempted) }
    catch (error) {
      if (pauseError(host) || !retryable(error) || deadline - now() < 1000) throw error
      // One bounded refresh can discover a new IP, but never download a failed
      // segment twice from the same IP or query DNS on every HLS retry.
      if (now() - (forcedRefreshAt.get(host) ?? -Infinity) < 15_000) throw error
      forcedRefreshAt.set(host, now())
      try { entry = await beforeDeadline(refresh(host), deadline) } catch { throw error }
      if (now() >= deadline || !entry.records.some((r) => !attempted.has(r.address) && stateFor(host, r.address, kind).until <= now())) throw error
      return tryAddresses(url, entry.records, deadline, attempted)
    }
  }

  return function fetchShared(value) {
    const url = new URL(value), key = url.href
    if (inflight.has(key)) {
      emit({ type: 'shared_request', host: url.hostname })
      return inflight.get(key)
    }
    if (inflight.size >= maxInflight) return Promise.reject(Object.assign(new Error('Local provider gateway is busy'), {status:503, code:'GATEWAY_BUSY', retryAfterMs:1000}))
    const task = fetchWithFallback(url).finally(() => inflight.delete(key))
    inflight.set(key, task)
    return task
  }
}
