import test from 'node:test'
import assert from 'node:assert/strict'
import { createProviderTransport } from '../server/provider-transport.mjs'
import { createPublicResolver } from '../server/provider-dns.mjs'

const host = 'https://strmfree.st/live/a/'
const records = (...addresses) => addresses.map(address => ({ address, ttl: 300 }))
const two = records('45.143.201.58', '31.43.191.60') // Synthetic same-host DNS fixture.
const failSystem = (address) => { if (!address) throw new Error('System DNS unreachable') }

test('failed IP is cooled down; successful alternate is preferred for next segment', async () => {
  const calls = []
  const fetch = createProviderTransport({resolve: async () => two,
    request: async (_url, ip) => { failSystem(ip); calls.push(ip); if (ip === two[0].address) throw new Error('offline'); return 'video' },
  })
  assert.equal(await fetch(host+'1.js'), 'video')
  assert.equal(await fetch(host+'2.js'), 'video')
  assert.deepEqual(calls, [two[0].address, two[1].address, two[1].address])
})

test('slow IP is hedged; winner cancels the losing download without penalizing it', async () => {
  let aborted = false, winnerSignal
  const fetch = createProviderTransport({resolve: async () => two, hedgeMs: 5,
    request: async (_url, ip, _timeout, signal) => {
      failSystem(ip)
      if (ip === two[1].address) { winnerSignal = signal; return 'fast' }
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')) }, {once:true}))
    },
  })
  assert.equal(await fetch(host+'1.js'), 'fast')
  assert.equal(aborted, true)
  assert.equal(winnerSignal.aborted, false)
})

test('identical concurrent segment requests share a single download', async () => {
  let downloads = 0
  const fetch = createProviderTransport({resolve: async () => two,
    request: async (_url, ip) => { failSystem(ip); downloads++; return 'video' },
  })
  assert.deepEqual(await Promise.all([fetch(host+'1.js'),fetch(host+'1.js')]), ['video','video'])
  assert.equal(downloads, 1)
})

test('all unhealthy addresses fail fast during cooldown and are retried afterwards', async () => {
  let now = 0, downloads = 0, healthy = false
  const fetch = createProviderTransport({now: () => now, resolve: async () => records(two[0].address),
    request: async (_url, ip) => { failSystem(ip); downloads++; if (!healthy) throw new Error('offline'); return 'video' },
  })
  await assert.rejects(fetch(host+'1.js'), /offline/)
  await assert.rejects(fetch(host+'2.js'), /temporarily unavailable/)
  assert.equal(downloads, 1)
  now = 5001; healthy = true
  assert.equal(await fetch(host+'3.js'), 'video')
  assert.equal(downloads, 2)
})

test('DNS refresh discovers a replacement IP without retrying the failed IP', async () => {
  let resolutions = 0
  const calls = []
  const fetch = createProviderTransport({resolve: async () => records(two[resolutions++ ? 1 : 0].address),
    request: async (_url, ip) => { failSystem(ip); calls.push(ip); if (ip === two[0].address) throw new Error('offline'); return 'video' },
  })
  assert.equal(await fetch(host+'1.js'), 'video')
  assert.deepEqual(calls, [two[0].address, two[1].address])
})

test('HTTP 503 fails over, but 403/404/429 are surfaced without IP hopping', async () => {
  for (const status of [503,403,404,429]) {
    let calls = 0
    const fetch = createProviderTransport({resolve: async () => two,
      request: async (_url, ip) => { failSystem(ip); calls++; if (ip === two[0].address) throw Object.assign(new Error('HTTP failure'),{status}); return 'video' },
    })
    if (status === 503) { assert.equal(await fetch(host+'1.js'),'video'); assert.equal(calls,2) }
    else { await assert.rejects(fetch(host+'1.js'), {status}); assert.equal(calls,1) }
  }
})

test('deadline cancels downloads even when an adapter never resolves', async () => {
  let aborted = false
  const fetch = createProviderTransport({resolve: async () => records(two[0].address), budgetMs: 30,
    request: async (_url, ip, _timeout, signal) => { failSystem(ip); signal.addEventListener('abort',()=>{aborted=true}); return new Promise(()=>{}) },
  })
  await assert.rejects(fetch(host+'1.js'), /deadline/)
  assert.equal(aborted,true)
})

test('only two IP requests run concurrently and at most three addresses are attempted', async () => {
  let active=0, max=0, calls=0
  const fetch = createProviderTransport({resolve: async () => records('1.1.1.1','2.2.2.2','3.3.3.3','4.4.4.4'), hedgeMs: 1,
    request: async (_url, ip) => { failSystem(ip); calls++; active++; max=Math.max(max,active); await new Promise(r=>setTimeout(r,5)); active--; throw new Error('offline') },
  })
  await assert.rejects(fetch(host+'1.js'))
  assert.equal(calls,3); assert.equal(max,2)
})

test('expired resolution is shared across different simultaneous segment URLs', async () => {
  let now=0, lookups=0
  const fetch = createProviderTransport({now:()=>now, resolve:async()=>{lookups++; return two}, request:async(_url,ip)=>{failSystem(ip);return 'video'} })
  await fetch(host+'1.js'); now=301000
  await Promise.all([fetch(host+'2.js'),fetch(host+'3.js')])
  assert.equal(lookups,2)
})

test('two DNS services merge and deduplicate public IPv4 results with conservative TTL', async () => {
  const resolve = createPublicResolver({fetch: async url => ({ok:true,json:async()=>({Status:0,Answer: url.includes('dns.google')
    ? [{type:1,data:'45.143.201.58',TTL:300},{type:1,data:'127.0.0.1',TTL:300}]
    : [{type:1,data:'45.143.201.58',TTL:60},{type:1,data:'31.43.191.60',TTL:120},{type:1,data:'10.0.0.1',TTL:300}]})})})
  assert.deepEqual(await resolve('strmfree.st'), [{address:'45.143.201.58',ttl:60},{address:'31.43.191.60',ttl:120}])
})

test('one DNS service outage does not discard healthy answers from the other', async () => {
  const resolve = createPublicResolver({fetch:async url=>{
    if (url.includes('dns.google')) throw new Error('offline')
    return {ok:true,json:async()=>({Status:0,Answer:[{type:1,data:'45.143.201.58',TTL:300}]})}
  }})
  assert.deepEqual(await resolve('strmfree.st'),records('45.143.201.58'))
})

test('a slow video IP does not block small playlist or catalog requests', async () => {
  const fetch = createProviderTransport({resolve: async () => records(two[0].address),
    request: async (url, ip) => { failSystem(ip); if (url.pathname.endsWith('.js')) throw new Error('slow segment'); return 'playlist' },
  })
  await assert.rejects(fetch(host+'1.js'), /slow segment/)
  assert.equal(await fetch(host+'index.m3u8'), 'playlist')
})

test('the total deadline also bounds a DNS refresh', async () => {
  const fetch = createProviderTransport({budgetMs:20,resolve:()=>new Promise(()=>{}),request:async()=>{throw new Error('offline')} })
  await assert.rejects(fetch(host+'1.js'), /deadline/)
})
