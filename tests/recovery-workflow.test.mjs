import test from 'node:test'
import assert from 'node:assert/strict'
import { createRecoveryScheduler, retryDelayFromResponse } from '../src/lib/recovery-scheduler.ts'
import { createProviderTransport } from '../server/provider-transport.mjs'

function harness() {
 let now=0,id=0,giveUps=0
 const timers=new Map(), retries=[], statuses=[]
 const recovery=createRecoveryScheduler({
  now:()=>now,
  schedule:(callback,delay)=>{const key=++id;timers.set(key,{at:now+delay,callback});return key},
  cancel:key=>timers.delete(key),
  onRetry:media=>retries.push({at:now,media}),onStatus:status=>statuses.push(status),onGiveUp:()=>giveUps++,
 })
 return {recovery,retries,statuses,get giveUps(){return giveUps},get timers(){return timers.size},
  advance(ms){const end=now+ms;while(true){const next=[...timers.entries()].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].callback()}now=end},
 }
}

test('pausing cancels a scheduled recovery and prevents manifest autoplay',()=>{
 const h=harness();h.recovery.request();h.recovery.pause();h.advance(60000)
 assert.equal(h.retries.length,0);assert.equal(h.recovery.mayPlay(),false)
 h.recovery.resume();h.advance(1000)
 assert.equal(h.retries.length,1);assert.equal(h.recovery.mayPlay(),true)
})

test('a fatal error while paused waits for the user to resume',()=>{
 const h=harness();h.recovery.pause();h.recovery.request(true);h.advance(60000)
 assert.equal(h.retries.length,0)
 h.recovery.resume();h.advance(1000)
 assert.deepEqual(h.retries,[{at:61000,media:true}])
})

test('provider waiting does not spend the four-attempt retry budget',()=>{
 const h=harness();h.recovery.defer(90000);h.advance(89999)
 assert.equal(h.retries.length,0);assert.equal(h.giveUps,0)
 assert.equal(h.statuses.at(-1).phase,'waiting')
 h.advance(1001);assert.equal(h.retries.length,1)
 for(let i=0;i<3;i++){h.recovery.request();h.advance(4000)}
 assert.equal(h.retries.length,4);assert.equal(h.giveUps,0)
 h.recovery.request();assert.equal(h.giveUps,1)
})

test('a later Retry-After cancels an already queued reconnect',()=>{
 const h=harness();h.recovery.request();h.advance(500);h.recovery.defer(10000)
 h.advance(9999);assert.equal(h.retries.length,0)
 h.advance(1001);assert.equal(h.retries.length,1)
})

test('pausing during backoff preserves remaining wait on resume',()=>{
 const h=harness();h.recovery.defer(30000);h.advance(5000);h.recovery.pause();h.advance(10000)
 assert.equal(h.timers,0)
 h.recovery.resume();assert.equal(h.statuses.at(-1).until,30000)
 h.advance(15999);assert.equal(h.retries.length,0)
 h.advance(1);assert.equal(h.retries.length,1)
})

test('disposed players cannot retry or autoplay after switching sources',()=>{
 const h=harness();h.recovery.request();h.recovery.dispose();h.advance(10000)
 h.recovery.resume();h.recovery.request();h.advance(10000)
 assert.equal(h.retries.length,0);assert.equal(h.recovery.mayPlay(),false);assert.equal(h.timers,0)
})

test('rapid errors share a scheduled retry and exhausted recovery stays stopped',()=>{
 const h=harness()
 for(let i=0;i<4;i++){for(let j=0;j<10;j++)h.recovery.request();h.advance(4000)}
 h.recovery.request();h.recovery.request();h.advance(60000)
 assert.equal(h.retries.length,4);assert.equal(h.giveUps,1);assert.equal(h.recovery.mayPlay(),false)
})

test('a sustained successful period can reset the retry budget',()=>{
 const h=harness()
 for(let i=0;i<4;i++){h.recovery.request();h.advance(4000)}
 h.recovery.resetAttempts();h.recovery.request();h.advance(1000)
 assert.equal(h.retries.length,5);assert.equal(h.giveUps,0)
})

test('very long waits use bounded timers without immediately retrying',()=>{
 const h=harness();h.recovery.defer(3e9);h.advance(120000)
 assert.equal(h.retries.length,0);assert.equal(h.timers,1)
 h.recovery.dispose();assert.equal(h.timers,0)
})

test('player recognizes Retry-After without retrying access-denied responses',()=>{
 assert.equal(retryDelayFromResponse(429,'60'),60000)
 assert.equal(retryDelayFromResponse(503,'Wed, 14 Oct 2026 10:01:00 GMT',Date.UTC(2026,9,14,10)),60000)
 assert.equal(retryDelayFromResponse(429,null),30000)
 assert.equal(retryDelayFromResponse(503,null),undefined)
 assert.equal(retryDelayFromResponse(403,'60'),undefined)
})

test('first system route is bounded and cancelled even if its adapter ignores timeout',async()=>{
 let aborted=false,lookups=0
 const fetch=createProviderTransport({budgetMs:20,resolve:async()=>{lookups++;return [{address:'45.143.201.58',ttl:300}]},request:async(_url,_ip,_timeout,signal)=>{
  signal.addEventListener('abort',()=>{aborted=true});return new Promise(()=>{})
 }})
 const result=await Promise.race([fetch('https://strmfree.st/live/a/1.js').then(()=> 'success',()=> 'bounded'),new Promise(r=>setTimeout(()=>r('hung'),100))])
 assert.equal(result,'bounded');assert.equal(aborted,true);assert.equal(lookups,0)
})
