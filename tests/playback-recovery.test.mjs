import test from 'node:test'
import assert from 'node:assert/strict'
import { createProviderTransport } from '../server/provider-transport.mjs'
import { shouldRecoverStall, hasPlaybackProgress } from '../src/lib/playback-recovery.ts'

test('DNS expiry refreshes working public DNS without returning to broken system DNS', async () => {
  let now = 0, systemCalls = 0, dnsCalls = 0
  const fetch = createProviderTransport({ now: () => now,
    request: async (_url,address) => { if (!address) { systemCalls++; throw new Error('timeout') } return address },
    resolve: async () => { dnsCalls++; return [{ address: '45.143.201.58', ttl: 300 }] },
  })
  const u = new URL('https://strmfree.st/live/a/1.js')
  assert.equal(await fetch(u), '45.143.201.58')
  now = 301_000
  assert.equal(await fetch(u), '45.143.201.58')
  assert.equal(systemCalls, 1)
  assert.equal(dnsCalls, 2)
})

test('temporary DNS outage keeps the last working address within a bounded grace period', async () => {
  let now = 0, calls = 0
  const fetch = createProviderTransport({ now: () => now,
    request: async (_url,address) => { if (!address) throw new Error('timeout'); return 'ok' },
    resolve: async () => { if (calls++) throw new Error('DNS offline'); return [{ address: '45.143.201.58', ttl: 300 }] },
  })
  const u = new URL('https://strmfree.st/live/a/1.js')
  assert.equal(await fetch(u), 'ok')
  now = 301_000
  assert.equal(await fetch(u), 'ok')
  now = 901_000
  await assert.rejects(fetch(u), /DNS offline/)
})

test('expired DNS refresh is shared by concurrent video requests', async () => {
  let now = 0, calls = 0
  const fetch = createProviderTransport({ now: () => now,
    request: async (_url,address) => { if (!address) throw new Error('timeout'); return 'ok' },
    resolve: async () => { calls++; return [{ address: '45.143.201.58', ttl: 300 }] },
  })
  const u = new URL('https://strmfree.st/live/a/1.js')
  await fetch(u)
  now = 301_000
  await Promise.all([fetch(u),fetch(u),fetch(u)])
  assert.equal(calls, 2)
})

test('HTTP failures preserve status and are not retried as DNS errors', async () => {
  let calls = 0
  const fetch = createProviderTransport({
    request: async () => { throw Object.assign(new Error('HTTP 403'), {status:403}) },
    resolve: async () => { calls++; return [] },
  })
  await assert.rejects(fetch(new URL('https://strmfree.st/live/a/1.js')), {status:403})
  assert.equal(calls, 0)
})

test('stalled playback recovers after 20 seconds; pauses and cooldown do not reconnect', () => {
  const state = {paused:false,ended:false,lastProgressAt:1000,lastRecoveryAt:0,now:40000}
  assert.equal(shouldRecoverStall(state),true)
  assert.equal(shouldRecoverStall({...state,paused:true}),false)
  assert.equal(shouldRecoverStall({...state,ended:true}),false)
  assert.equal(shouldRecoverStall({...state,lastProgressAt:30000}),false)
  assert.equal(shouldRecoverStall({...state,lastRecoveryAt:35000}),false)
})


test('seeking to a new live position without decoded frames is not successful recovery', () => {
  assert.equal(hasPlaybackProgress(150, 40, 1), false)
  assert.equal(hasPlaybackProgress(151, 150, 4), true)
  assert.equal(hasPlaybackProgress(40, 40, 4), false)
})
