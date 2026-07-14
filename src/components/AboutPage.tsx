import type React from "react"
import {
  Tv,
  List,
  Trophy,
  ExternalLink,
  Monitor,
  Radio,
  Zap,
  Globe,
  Heart,
  ArrowRight,
  Play,
  Search,
  Scale,
  Music,
  Headphones,
  ListMusic,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import type { Tab } from "../App"

interface AboutPageProps {
  onNavigate: React.Dispatch<React.SetStateAction<Tab>>
}

const destinations = [
  {
    id: "iptv" as Tab,
    icon: Tv,
    title: "IPTV Player",
    description: "Curated channels with HLS playback and quick category filters.",
    color: "text-accent-light",
    metric: "4+",
    metricLabel: "curated",
  },
  {
    id: "catalog" as Tab,
    icon: List,
    title: "IPTV Catalog",
    description: "Search & browse channels from iptv-org and Free-TV sources.",
    color: "text-sport-green",
    metric: "14000+",
    metricLabel: "channels",
  },
    {
      id: "sports" as Tab,
      icon: Trophy,
      title: "Live Sports",
      description: "Dual-source engine: StreamFree + ESportex with auto-fallback and dedup.",
      color: "text-sport-yellow",
      metric: "9",
      metricLabel: "sports",
    },
  {
    id: "music" as Tab,
    icon: Music,
    title: "Stream Music",
    description: "YouTube Music search, 45K+ radio stations, playlists & more.",
    color: "text-purple-400",
    metric: "45K+",
    metricLabel: "stations",
  },
]

const stats = [
  { label: "IPTV channels", value: "14000+", icon: Radio, color: "text-accent-light" },
  { label: "Radio stations", value: "45K+", icon: Headphones, color: "text-purple-400" },
  { label: "Sports categories", value: "9", icon: Trophy, color: "text-sport-yellow" },
  { label: "Open source", value: "100%", icon: Heart, color: "text-sport-red" },
]

const sourceCards = [
  {
    title: "iptv-org/iptv",
    href: "https://github.com/iptv-org/iptv",
    icon: Globe,
    description: "Community-maintained M3U playlists with category-based grouping.",
    tags: ["M3U", "Open source", "Global"],
    tone: "text-sport-green",
  },
  {
    title: "Free-TV/IPTV",
    href: "https://github.com/Free-TV/IPTV",
    icon: Globe,
    description: "Country-organized IPTV channels with 80+ countries and region tags.",
    tags: ["M3U", "Country-based", "1800+ channels"],
    tone: "text-accent-light",
  },
  {
    title: "StreamFree API",
    href: "https://streamfree.top/api/v1",
    icon: Trophy,
    description: "Primary sports source — live-only streams with real team badges and viewer counts.",
    tags: ["REST API", "Live streams", "Real viewers", "Badges"],
    tone: "text-sport-green",
  },
  {
    title: "ESportex API",
    href: "https://api.esportex.site",
    icon: Trophy,
    description: "Secondary sports source — fallback; covers upcoming + live events across many leagues.",
    tags: ["REST API", "Fallback", "Upcoming + live"],
    tone: "text-sport-yellow",
  },
  {
    title: "Radio Browser API",
    href: "https://www.radio-browser.info",
    icon: Headphones,
    description: "Free, open-source database of 45,000+ internet radio stations worldwide.",
    tags: ["REST API", "45K+ stations", "No auth"],
    tone: "text-purple-400",
  },
  {
    title: "Invidious API",
    href: "https://invidious.io",
    icon: Music,
    description: "Privacy-friendly YouTube frontend for music search without API keys.",
    tags: ["YouTube", "No auth", "Privacy"],
    tone: "text-pink-400",
  },
]

const musicFeatures = [
  {
    icon: Headphones,
    title: "Internet Radio",
    desc: "45,000+ stations from 200+ countries. Browse by genre, country, or search.",
  },
  {
    icon: Music,
    title: "YouTube Music",
    desc: "Search and play YouTube music directly in the browser via Invidious.",
  },
  {
    icon: ListMusic,
    title: "Playlists & Queue",
    desc: "Create playlists, manage queue, play next, shuffle & repeat.",
  },
  {
    icon: Heart,
    title: "Favorites & History",
    desc: "Save favorites and recently played tracks. All persisted locally.",
  },
]

export default function AboutPage({ onNavigate }: AboutPageProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const panelClass = isDark
    ? "bg-dark-300/30 border-white/[0.06]"
    : "bg-white border-slate-200"

  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const strongText = isDark ? "text-white" : "text-slate-900"

  return (
    <div className="flex flex-col gap-5 sm:gap-6 xl:h-full">
      {/* Hero Section */}
      <section className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-extrabold ${strongText}`}>
                About StreamHub
              </h1>
              <p className={`mt-1 max-w-2xl text-sm sm:text-base ${mutedText}`}>
                IPTV, channel discovery, live sports, and music streaming — all in one focused dashboard.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <button
              onClick={() => onNavigate("iptv")}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent-light"
            >
              <Play className="w-4 h-4" />
              Watch
            </button>
            <button
              onClick={() => onNavigate("music")}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-600 hover:to-pink-600"
            >
              <Music className="w-4 h-4" />
              Listen
            </button>
            <button
              onClick={() => onNavigate("catalog")}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                isDark
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-3 sm:p-4 ${panelClass}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-lg sm:text-xl font-bold leading-tight ${strongText}`}>
                  {stat.value}
                </p>
                <p className={`text-[11px] sm:text-xs truncate ${mutedText}`}>
                  {stat.label}
                </p>
              </div>
              <stat.icon className={`w-5 h-5 shrink-0 ${stat.color}`} />
            </div>
          </div>
        ))}
      </section>

      {/* Open A Section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap className={`w-4 h-4 ${mutedText}`} />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedText}`}>
            Open A Section
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {destinations.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group min-h-[132px] rounded-2xl border p-4 text-left transition-colors ${
                isDark
                  ? "bg-dark-300/30 border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold leading-tight ${strongText}`}>
                    {item.metric}
                  </p>
                  <p className={`text-[10px] uppercase tracking-wider ${mutedText}`}>
                    {item.metricLabel}
                  </p>
                </div>
              </div>

              <h3 className={`mt-4 text-base font-bold ${strongText}`}>
                {item.title}
              </h3>
              <p className={`mt-1 text-sm leading-relaxed ${mutedText}`}>
                {item.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent-light transition-all group-hover:gap-2">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Stream Music Features */}
      <section className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedText}`}>
            Stream Music — Free Music Portal
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {musicFeatures.map((f) => (
            <div key={f.title} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
              <f.icon className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? "text-purple-400" : "text-purple-500"}`} />
              <div>
                <p className={`text-sm font-bold ${strongText}`}>{f.title}</p>
                <p className={`text-xs mt-0.5 leading-relaxed ${mutedText}`}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigate("music")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all hover:from-purple-600 hover:to-pink-600"
        >
          <Headphones className="w-4 h-4" />
          Open Stream Music
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* Data Sources */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Heart className={`w-4 h-4 ${mutedText}`} />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedText}`}>
            Data Sources
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sourceCards.map((source) => (
            <div
              key={source.title}
              className={`rounded-2xl border p-4 ${panelClass}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                  <source.icon className={`w-5 h-5 ${source.tone}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold truncate ${strongText}`}>
                      {source.title}
                    </h3>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-light hover:text-accent"
                      aria-label={`Open ${source.title}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className={`mt-1 text-sm leading-relaxed ${mutedText}`}>
                    {source.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {source.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Legal */}
      <section
        className={`rounded-2xl border p-4 sm:p-5 ${
          isDark ? "bg-dark-300/30 border-white/[0.06]" : "bg-white border-slate-200"
        }`}
      >
        <button
          onClick={() => onNavigate("legal")}
          className={`w-full flex items-center gap-3 text-left transition-colors rounded-xl px-3 py-2 ${
            isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
            <Scale className="w-5 h-5 text-accent-light" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold ${strongText}`}>Legal & Terms</p>
            <p className={`text-xs ${mutedText}`}>
              Disclaimer, terms and conditions, privacy policy, and liability information.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 text-accent-light" />
        </button>
      </section>
    </div>
  )
}
