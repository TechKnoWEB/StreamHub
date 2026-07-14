import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

function rewritePlaylist(body: string, targetUrl: string, proxyEndpoint: string): string {
  const proxy = (url: string) => proxyEndpoint + encodeURIComponent(new URL(url, targetUrl).href)
  return body
    .replace(/URI="([^"]*)"/g, (_, u: string) => `URI="${proxy(u)}"`)
    .replace(/^(?!#)(.+)$/gm, (line) => {
      const u = line.trim()
      return u && !u.startsWith("#") ? proxy(u) : line
    })
}

function iptvProxy(): Plugin {
  return {
    name: "iptv-proxy",
    configureServer(server) {
      server.middlewares.use("/api/iptv-proxy", async (req, res) => {
        const urlStr = new URL(req.url!, "http://localhost").searchParams.get("url")
        if (!urlStr) { res.statusCode = 400; res.end("Missing url"); return }

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
            res.statusCode = proxyRes.status
            res.end(`Origin server returned ${proxyRes.status}`)
            return
          }

          const origin = req.headers.origin || "*"
          res.setHeader("Access-Control-Allow-Origin", origin)
          res.setHeader("Access-Control-Allow-Credentials", "true")
          res.setHeader("Access-Control-Allow-Headers", "*")

          if (isM3U8) {
            const body = await proxyRes.text()
            const rewritten = rewritePlaylist(body, targetUrl, `/api/iptv-proxy?url=`)
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl")
            res.end(rewritten)
          } else {
            res.setHeader("Content-Type", proxyRes.headers.get("content-type") || "video/MP2T")
            const chunks: Uint8Array[] = []
            const reader = proxyRes.body!.getReader()
            while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value) }
            const total = chunks.reduce((a, c) => a + c.length, 0)
            const buf = new Uint8Array(total)
            let offset = 0
            for (const chunk of chunks) { buf.set(chunk, offset); offset += chunk.length }
            res.end(Buffer.from(buf))
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          res.statusCode = 502
          res.end(`IPTV proxy error: ${msg}`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    iptvProxy(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      devOptions: { enabled: true },
      manifest: {
        name: "StreamHub — IPTV Dashboard",
        short_name: "StreamHub",
        description: "Watch live TV channels, sports streams, and 45K+ radio stations worldwide",
        theme_color: "#0f0f1a",
        background_color: "#0f0f1a",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["entertainment", "sports", "news", "music"],
        icons: [
          {
            src: "icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/iptv-org\.github\.io\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "iptv-sources",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "github-sources",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.m3u8$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "hls-streams",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
})
