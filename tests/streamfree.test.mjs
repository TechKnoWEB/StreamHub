import test from 'node:test'
import assert from 'node:assert/strict'
import { streamFreeSources, streamFreePlayerURL, isHlsSource } from '../src/lib/streamfree-sources.ts'
import { allowedURL, parsePlayer, rewritePlaylist, streamfreeHandler } from '../server/streamfree.mjs'

test('current sources array and legacy embed_url are accepted and deduplicated', () => {
  const one = 'https://strmfree.st/embed/cricket/willow1080p'
  const two = 'https://strmfree.st/embed/cricket/willow720p2'
  assert.deepEqual(streamFreeSources({ sources: [one, { url: two }, 'javascript:alert(1)', null], embed_url: one }), [one, two])
  assert.deepEqual(streamFreeSources({ embed_url: one }), [one])
})

test('StreamFree embeds use local playback gateway; unrelated embeds stay unchanged', () => {
  const url = streamFreePlayerURL('https://strmfree.st/embed/cricket/willow1080p')
  assert.ok(url.startsWith('/api/streamfree?action=playlist&embed='))
  assert.equal(streamFreePlayerURL('https://example.com/player'), 'https://example.com/player')
})

test('HLS detection handles signed URLs and gateway URLs', () => {
  assert.equal(isHlsSource('https://example.com/live/index.m3u8?token=abc'), true)
  assert.equal(isHlsSource('/api/streamfree?action=playlist&embed=test'), true)
  assert.equal(isHlsSource('/api/streamfree?action=catalog'), false)
  assert.equal(isHlsSource('https://example.com/embed/foo'), false)
})

test('gateway rejects arbitrary hosts, credentials, ports, paths and insecure protocols', () => {
  for (const url of ['http://strmfree.st/live/a/1.ts', 'https://127.0.0.1/live/a/1.ts', 'https://strmfree.st.evil.test/live/a/1.ts', 'https://user:pw@strmfree.st/live/a/1.ts', 'https://strmfree.st:444/live/a/1.ts', 'https://strmfree.st/admin', 'https://strmfree.st/live/a/../../admin']) {
    assert.throws(() => allowedURL(url))
  }
  assert.equal(allowedURL('https://cdn1.streamfree.top/live/a/1.js').hostname, 'cdn1.streamfree.top')
})

test('player parser reads issued playback parameters without executing scripts', () => {
  const html = `const QUALITY = '1080p'; const SOURCE_SUFFIX = '2'; const VARIANT = 'willow' + QUALITY + SOURCE_SUFFIX;\nconst _0x = {"1080p":{"_t":"issued","_n":"nonce","_e":2000000000}};`
  assert.deepEqual(parsePlayer(html), { key: 'willow', variant: 'willow1080p2', signed: { _t: 'issued', _n: 'nonce', _e: 2000000000 } })
  assert.throws(() => parsePlayer('<html>Changed player</html>'), /format changed/)
})

test('playlist rewriting preserves signed query parameters and rewrites media and key URIs', () => {
  const text = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin?token=a%2Bb"\nsegment.js\n'
  const result = rewritePlaylist(text, 'https://strmfree.st/live/willow/index.m3u8')
  assert.ok(result.startsWith('#EXTM3U'))
  assert.ok(result.includes(encodeURIComponent('https://strmfree.st/live/willow/key.bin?token=a%2Bb')))
  assert.ok(result.includes(encodeURIComponent('https://strmfree.st/live/willow/segment.js')))
  assert.throws(() => rewritePlaylist('#EXTM3U\nhttp://127.0.0.1/secret\n', 'https://strmfree.st/live/willow/index.m3u8'))
})

test('gateway rejects unsupported methods and actions without contacting upstream', async () => {
  const response = () => ({ statusCode: 200, headers: {}, setHeader(k,v) { this.headers[k]=v }, end(body) { this.body=body } })
  const post = response()
  await streamfreeHandler({ method: 'POST', url: '/api/streamfree' }, post)
  assert.equal(post.statusCode, 405)
  const unknown = response()
  await streamfreeHandler({ method: 'GET', url: '/api/streamfree?action=unknown' }, unknown)
  assert.equal(unknown.statusCode, 400)
})
