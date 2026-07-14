import { Readable } from "stream"

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Headers", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  const urlStr = req.query?.url
  if (!urlStr) {
    res.status(400).end("Missing url")
    return
  }

  const targetUrl = decodeURIComponent(urlStr)
  const isM3U8 = /\.m3u8/i.test(targetUrl)

  try {
    const proxyRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
      },
    })

    if (!proxyRes.ok) {
      res.status(proxyRes.status).end(`Origin server returned ${proxyRes.status}`)
      return
    }

    if (isM3U8) {
      const body = await proxyRes.text()
      const rewritten = rewritePlaylist(body, targetUrl)
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl")
      res.end(rewritten)
    } else {
      res.setHeader("Content-Type", proxyRes.headers.get("content-type") || "video/MP2T")
      const reader = proxyRes.body.getReader()
      const nodeStream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read()
            if (done) { this.push(null); return }
            this.push(Buffer.from(value))
          } catch (e) {
            this.destroy(e)
          }
        },
      })
      nodeStream.pipe(res)
    }
  } catch (e) {
    res.status(502).end(`IPTV proxy error: ${e.message || e}`)
  }
}

function rewritePlaylist(body, targetUrl) {
  const proxyEndpoint = "/api/iptv-proxy?url="
  const proxy = (url) => proxyEndpoint + encodeURIComponent(new URL(url, targetUrl).href)
  return body
    .replace(/URI="([^"]*)"/g, (_, u) => `URI="${proxy(u)}"`)
    .replace(/^(?!#)(.+)$/gm, (line) => {
      const u = line.trim()
      return u && !u.startsWith("#") ? proxy(u) : line
    })
}
