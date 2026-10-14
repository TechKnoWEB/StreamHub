export type RecoveryStatus = { phase: 'paused' | 'reconnecting' | 'waiting' | 'failed'; until?: number }

// One owner for retries: user pause and provider backoff both take precedence.
export function createRecoveryScheduler(options: {
  onRetry: (media: boolean) => void
  onStatus: (status: RecoveryStatus) => void
  onGiveUp: () => void
  now?: () => number
  schedule?: (callback: () => void, delay: number) => unknown
  cancel?: (timer: unknown) => void
}) {
  const now = options.now ?? Date.now
  const schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay))
  const cancel = options.cancel ?? ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>))
  let paused = false, disposed = false, failed = false, attempts = 0, blockedUntil = 0
  let pending: boolean | undefined, timer: unknown
  const clear = () => { if (timer !== undefined) cancel(timer); timer = undefined }
  const run = () => {
    if (disposed || failed || pending === undefined || timer !== undefined) return
    if (paused) { options.onStatus({ phase: 'paused' }); return }
    const remaining = blockedUntil - now()
    if (remaining > 0) {
      options.onStatus({ phase: 'waiting', until: blockedUntil })
      // Long Retry-After values must not overflow the browser's timer range.
      timer = schedule(() => { timer = undefined; run() }, Math.min(remaining, 60_000))
      return
    }
    if (attempts >= 4) {
      failed = true
      options.onStatus({ phase: 'failed' })
      options.onGiveUp()
      return
    }
    options.onStatus({ phase: 'reconnecting' })
    timer = schedule(() => {
      timer = undefined
      if (disposed || paused) return
      if (blockedUntil > now()) { run(); return }
      const media = pending!
      pending = undefined
      attempts++
      options.onRetry(media)
    }, Math.min((attempts + 1) * 1000, 4000))
  }
  return {
    request(media = false) { if (disposed || failed) return; pending ??= media; run() },
    pause() { paused = true; clear(); if (!disposed) options.onStatus({ phase: 'paused' }) },
    resume() { paused = false; run() },
    defer(milliseconds: number) {
      if (disposed || failed || !Number.isFinite(milliseconds)) return
      blockedUntil = Math.max(blockedUntil, now() + Math.max(1000, milliseconds))
      pending = false
      clear(); run()
    },
    resetAttempts() { if (!failed) attempts = 0 },
    mayPlay: () => !paused && !disposed && !failed,
    isWaiting: () => blockedUntil > now(),
    isFailed: () => failed,
    dispose() { disposed = true; pending = undefined; clear() },
  }
}

export function retryDelayFromResponse(status: number | undefined, header: string | null | undefined, now = Date.now()): number | undefined {
  if (status !== 429 && status !== 503) return undefined
  if (header && /^\d+$/.test(header.trim())) {
    const ms = Number(header.trim()) * 1000
    if (Number.isSafeInteger(ms)) return Math.max(1000, ms)
  }
  if (header && /[a-z]/i.test(header)) {
    const date = Date.parse(header)
    if (Number.isFinite(date)) return Math.max(1000, date - now)
  }
  return status === 429 ? 30_000 : undefined
}
