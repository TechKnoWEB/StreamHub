import { useState, useMemo } from "react"
import {
  Tv,
  Radio,
  Play,
  Signal,
  Zap,
  CircleDot,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useLiveStream } from "../context/LiveStreamContext"
import VideoPlayer from "./VideoPlayer"
import type { Channel } from "../types"

const channels: Channel[] = [
  {
    id: "bein-xtra",
    name: "beIN SPORTS XTRA",
    url: "https://bein-xtra-bein.amagi.tv/playlist.m3u8",
    category: "Sports",
    quality: "FHD",
  },
  /*{
    id: "fox-sports-1",
    name: "Fox Sports 1",
    url: "https://cors-proxy.cooks.fyi/http://190.11.225.124:5000/live/fs1_hd/playlist.m3u8",
    category: "Sports",
    quality: "HD",
  },*/
  {
    id: "caze-tv",
    name: "Caze TV BR (FIFA World Cup)",
    url: "https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8",
    category: "Sports",
    quality: "HD",
  },
  {
    id: "ct-sport",
    name: "CT Sport 25p (FIFA World Cup)",
    url: "http://88.212.15.19/live/test_ctsport_25p/playlist.m3u8",
    category: "Sports",
    quality: "HD",
  },
]

function getQualityColor(q: string, isDark: boolean) {
  switch (q) {
    case "FHD":
      return isDark
        ? "bg-sport-green/20 text-sport-green border-sport-green/30"
        : "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "HD":
      return isDark
        ? "bg-accent/20 text-accent-light border-accent/30"
        : "bg-violet-50 text-violet-700 border-violet-200"
    case "SD":
      return isDark
        ? "bg-white/5 text-dark-100 border-white/10"
        : "bg-slate-100 text-slate-500 border-slate-200"
    default:
      return isDark
        ? "bg-white/5 text-dark-100 border-white/10"
        : "bg-slate-100 text-slate-500 border-slate-200"
  }
}

export default function IPTVPlayer() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { liveMatch } = useLiveStream()
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0])
  const [filter, setFilter] = useState<string>("All")
  const [watchingLive, setWatchingLive] = useState(false)

  const filtered = useMemo(
    () => (filter === "All" ? channels : channels.filter((c) => c.category === filter)),
    [filter]
  )

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const ch of channels) {
      map.set(ch.category, (map.get(ch.category) || 0) + 1)
    }
    return map
  }, [])

  return (
    <div className="flex flex-col xl:h-full">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className={`p-2 rounded-xl ${isDark ? "bg-accent/20" : "bg-accent/10"}`}>
            <Tv className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              IPTV Player
            </h2>
            <p className={`text-sm ${isDark ? "text-dark-100" : "text-slate-500"}`}>
              Select a channel to start streaming
            </p>
          </div>
          <span className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sport-green/20 text-sport-green rounded-full border border-sport-green/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sport-green animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 xl:flex-1 xl:min-h-0">
        {/* Player Section */}
        <div className="xl:col-span-2 flex flex-col min-h-0">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/5 xl:aspect-auto xl:flex-1 xl:min-h-0">
            {watchingLive && liveMatch ? (
              <iframe
                src={liveMatch.embedUrl}
                className="w-full h-full border-0"
                title={liveMatch.title}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <VideoPlayer
                src={activeChannel.url}
                title={`${activeChannel.name} — ${activeChannel.category}`}
                fillContainer
              />
            )}
          </div>

          {/* Now Playing Bar */}
          <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl border backdrop-blur-sm transition-colors ${isDark ? "bg-dark-300/30 border-white/5" : "bg-white/80 border-slate-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${watchingLive ? "bg-sport-red/20" : isDark ? "bg-accent/20" : "bg-accent/10"}`}>
                  {watchingLive ? (
                    <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 text-sport-red" />
                  ) : (
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-accent-light" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                    {watchingLive && liveMatch ? liveMatch.title : activeChannel.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs hidden sm:inline ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                      {watchingLive && liveMatch ? liveMatch.teams.home.name + " vs " + liveMatch.teams.away.name : activeChannel.category}
                    </span>
                    {watchingLive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-sport-red/15 text-sport-red rounded">
                        <span className="w-1 h-1 rounded-full bg-sport-red animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {!watchingLive && (
                      <>
                        <span className={`w-1 h-1 rounded-full hidden sm:block ${isDark ? "bg-dark-100" : "bg-slate-400"}`} />
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getQualityColor(activeChannel.quality, isDark)}`}>
                          {activeChannel.quality}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <Signal className="w-3.5 h-3.5 text-sport-green" />
                <span className="text-sport-green font-medium hidden sm:inline">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col min-h-0">
          {/* Category Filters */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className={`w-4 h-4 ${isDark ? "text-dark-100" : "text-slate-400"}`} />
              <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Channels
              </h3>
              <span className={`text-xs ${isDark ? "text-dark-100" : "text-slate-400"}`}>
                ({channels.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 sm:max-h-none">
              <button
                onClick={() => setFilter("All")}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
                  filter === "All"
                    ? "bg-accent text-white shadow-lg shadow-accent/25"
                    : isDark
                      ? "bg-white/5 text-dark-100 hover:text-white hover:bg-white/10"
                      : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
                    filter === cat
                      ? "bg-accent text-white shadow-lg shadow-accent/25"
                      : isDark
                        ? "bg-white/5 text-dark-100 hover:text-white hover:bg-white/10"
                        : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                  <span className="ml-1 opacity-50">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Channel List */}
          <div className="max-h-[46vh] xl:max-h-none xl:flex-1 overflow-y-auto space-y-1.5 pr-1 pb-1">
            {/* Live Match Card */}
            {liveMatch && (
              <button
                onClick={() => setWatchingLive(true)}
                className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 ${
                  watchingLive
                    ? isDark
                      ? "border-sport-red/50 bg-sport-red/10 shadow-lg shadow-sport-red/10"
                      : "border-sport-red/30 bg-sport-red/5 shadow-md shadow-sport-red/10"
                    : isDark
                      ? "border-sport-red/20 bg-sport-red/5 hover:border-sport-red/30 hover:bg-sport-red/10"
                      : "border-sport-red/20 bg-red-50 hover:border-sport-red/30 hover:bg-red-50/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-sport-red/20">
                    <CircleDot className="w-5 h-5 text-sport-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate text-sport-red">
                        {liveMatch.teams.home.name} vs {liveMatch.teams.away.name}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-sport-red/15 text-sport-red rounded shrink-0">
                        <span className="w-1 h-1 rounded-full bg-sport-red animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                        {liveMatch.title}
                      </span>
                      {liveMatch.viewers > 0 && (
                        <span className={`text-[10px] ${isDark ? "text-dark-100" : "text-slate-400"}`}>
                          {liveMatch.viewers} viewers
                        </span>
                      )}
                    </div>
                  </div>
                  {watchingLive && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Play className="w-4 h-4 text-sport-red" />
                      <div className="w-2 h-2 rounded-full bg-sport-red animate-pulse" />
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Regular Channels */}
            {filtered.map((channel) => {
              const isActive = !watchingLive && activeChannel.id === channel.id
              return (
                <button
                  key={channel.id}
                  onClick={() => { setActiveChannel(channel); setWatchingLive(false) }}
                  className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 ${
                    isActive
                      ? isDark
                        ? "border-accent/50 bg-accent/10 shadow-lg shadow-accent/10"
                        : "border-accent/30 bg-accent/5 shadow-md shadow-accent/10"
                      : isDark
                        ? "border-white/5 bg-dark-300/30 hover:border-white/10 hover:bg-white/5"
                        : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isActive
                          ? "bg-accent/20 text-accent-light"
                          : isDark
                            ? "bg-white/5 text-dark-100"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Tv className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-accent-light" : isDark ? "text-white" : "text-slate-900"}`}>
                        {channel.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${isDark ? "text-dark-100" : "text-slate-500"}`}>
                          {channel.category}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getQualityColor(channel.quality, isDark)}`}>
                          {channel.quality}
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Play className="w-4 h-4 text-accent-light" />
                        <div className="w-2 h-2 rounded-full bg-sport-green animate-pulse" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
