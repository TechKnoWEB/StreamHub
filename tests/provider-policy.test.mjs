import test from 'node:test'
import assert from 'node:assert/strict'
import { createProviderTransport } from '../server/provider-transport.mjs'
import { createRoutingDiagnostics, parseRetryAfter, providerErrorResponse } from '../server/provider-policy.mjs'
import { streamfreeHandler } from '../server/streamfree.mjs'

const host='https://strmfree.st/live/a/'
const ips=[{address:'45.143.201.58',ttl:300},{address:'31.43.191.60',ttl:300}]
const noSystem=ip=>{if(!ip)throw new Error('DNS unavailable')}

test('Retry-After accepts seconds and HTTP dates, rejecting invalid values',()=>{
 const now=Date.UTC(2026,9,14,10)
 assert.equal(parseRetryAfter('30',now),30000)
 assert.equal(parseRetryAfter('Wed, 14 Oct 2026 10:01:00 GMT',now),60000)
 assert.equal(parseRetryAfter('Wed, 14 Oct 2026 09:59:00 GMT',now),0)
 assert.equal(parseRetryAfter('not-a-date',now),undefined)
 assert.equal(parseRetryAfter('',now),undefined)
 assert.equal(parseRetryAfter('-1',now),undefined)
})

test('rate limits stop requests across segment URLs and resume after the specified delay',async()=>{
 let now=0,calls=0,limited=true
 const fetch=createProviderTransport({now:()=>now,resolve:async()=>ips,request:async(_url,ip)=>{
  noSystem(ip);calls++
  if(limited)throw Object.assign(new Error('Rate limited'),{status:429,retryAfterMs:60000})
  return 'video'
 }})
 await assert.rejects(fetch(host+'1.js'),{status:429,code:'PROVIDER_BACKOFF',retryAfterMs:60000})
 now=59000
 await assert.rejects(fetch(host+'2.js'),{status:429,retryAfterMs:1000})
 assert.equal(calls,1)
 now=60001;limited=false
 assert.equal(await fetch(host+'3.js'),'video')
 assert.equal(calls,2)
})

test('503 with Retry-After pauses the host instead of trying another IP',async()=>{
 let calls=0
 const fetch=createProviderTransport({resolve:async()=>ips,request:async(_url,ip)=>{
  noSystem(ip);calls++;throw Object.assign(new Error('Maintenance'),{status:503,retryAfterMs:30000})
 }})
 await assert.rejects(fetch(host+'1.js'),{status:503,code:'PROVIDER_BACKOFF'})
 await assert.rejects(fetch(host+'2.js'),{status:503,code:'PROVIDER_BACKOFF'})
 assert.equal(calls,1)
})

test('rate limits on the system route do not trigger DNS failover',async()=>{
 let calls=0,lookups=0
 const fetch=createProviderTransport({resolve:async()=>{lookups++;return ips},request:async()=>{
  calls++;throw Object.assign(new Error('Rate limited'),{status:429})
 }})
 await assert.rejects(fetch(host+'1.js'),{status:429})
 await assert.rejects(fetch(host+'2.js'),{status:429})
 assert.equal(calls,1);assert.equal(lookups,0)
})

test('valid cached DNS keeps serving during a slow pre-expiry refresh',async()=>{
 let now=0,lookups=0,release
 const calls=[]
 const fetch=createProviderTransport({now:()=>now,resolve:async()=>{
  lookups++;if(lookups===1)return [ips[0]]
  return new Promise(r=>{release=r})
 },request:async(_url,ip)=>{noSystem(ip);calls.push(ip);return 'video'}})
 await fetch(host+'1.js');now=275000
 assert.equal(await fetch(host+'2.js'),'video')
 assert.equal(await fetch(host+'3.js'),'video')
 assert.equal(lookups,2)
 release([ips[1]])
 await new Promise(r=>setImmediate(r))
 assert.equal(await fetch(host+'4.js'),'video')
 assert.deepEqual(calls,[ips[0].address,ips[0].address,ips[0].address,ips[1].address])
})

test('failed proactive refresh leaves a still-valid DNS answer usable',async()=>{
 let now=0,lookups=0
 const fetch=createProviderTransport({now:()=>now,resolve:async()=>{
  if(lookups++)throw new Error('DNS offline');return [ips[0]]
 },request:async(_url,ip)=>{noSystem(ip);return 'video'}})
 await fetch(host+'1.js');now=275000
 assert.equal(await fetch(host+'2.js'),'video')
 assert.equal(await fetch(host+'3.js'),'video')
 assert.equal(lookups,2)
})

test('request admission is bounded, while duplicate requests still share a slot',async()=>{
 let release
 const fetch=createProviderTransport({maxInflight:1,resolve:async()=>ips,request:async()=>new Promise(r=>{release=r})})
 const first=fetch(host+'1.js'),duplicate=fetch(host+'1.js')
 assert.equal(first,duplicate)
 await assert.rejects(fetch(host+'2.js'),{status:503,code:'GATEWAY_BUSY'})
 release('video')
 assert.equal(await first,'video')
})

test('routing diagnostics are bounded and do not expose signed query strings',async()=>{
 const log=createRoutingDiagnostics({limit:3})
 const fetch=createProviderTransport({onEvent:log.record,resolve:async()=>ips,request:async(_url,ip)=>{noSystem(ip);return 'video'}})
 for(let n=0;n<4;n++)await fetch(host+n+'.js?_t=secret-token')
 log.record({type:'custom',host:'strmfree.st',url:'https://example.test/?secret',headers:{Authorization:'secret'},message:'secret'})
 const result=log.snapshot()
 assert.equal(result.recent.length,3)
 assert.equal(result.counts.route_success,4)
 assert.ok(!JSON.stringify(result).includes('secret'))
 result.recent[0].type='modified'
 assert.notEqual(log.snapshot().recent[0].type,'modified')
})

test('diagnostics failures cannot prevent a media request succeeding',async()=>{
 const fetch=createProviderTransport({onEvent:()=>{throw new Error('log failure')},resolve:async()=>ips,request:async(_url,ip)=>{noSystem(ip);return 'video'}})
 assert.equal(await fetch(host+'1.js'),'video')
})

test('gateway preserves retry status and exposes a stable error code',()=>{
 const error=Object.assign(new Error('Provider requested a retry delay'),{status:429,retryAfterMs:1501,code:'PROVIDER_BACKOFF'})
 assert.deepEqual(providerErrorResponse(error),{status:429,retryAfter:2,body:{error:error.message,code:'PROVIDER_BACKOFF',upstreamStatus:429}})
 assert.equal(providerErrorResponse(Object.assign(new Error('Forbidden'),{status:403})).status,502)
})

test('health diagnostics are local-only and never rely on forwarded client addresses',async()=>{
 for(const [address,status]of [['127.0.0.1',200],['::1',200],['203.0.113.1',403]]){
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body}}
  await streamfreeHandler({method:'GET',url:'/?action=health',socket:{remoteAddress:address},headers:{'x-forwarded-for':'127.0.0.1'}},res)
  assert.equal(res.statusCode,status)
  if(status===200)assert.ok(JSON.parse(res.body).recent)
 }
})

test('a new provider pause cancels a queued hedge from another segment',async()=>{
 let limited=false,alternateCalls=0
 const fetch=createProviderTransport({hedgeMs:15,resolve:async()=>ips,request:async(url,ip,_timeout,signal)=>{
  noSystem(ip)
  if(!limited)return 'warmup'
  if(ip===ips[1].address)alternateCalls++
  if(url.pathname.endsWith('limited.js'))throw Object.assign(new Error('Rate limited'),{status:429,retryAfterMs:30000})
  return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))
 }})
 await fetch(host+'warmup.js');limited=true
 const pending=fetch(host+'pending.js')
 const rejection=assert.rejects(pending,{status:429})
 await assert.rejects(fetch(host+'limited.js'),{status:429})
 await rejection
 assert.equal(alternateCalls,0)
})
