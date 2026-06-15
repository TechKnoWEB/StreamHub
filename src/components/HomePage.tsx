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
  Wifi,
  Search,
  Code2,
  Palette,
  Gauge,
  Scale,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import type { Tab } from "../App"

interface HomePageProps {
  onNavigate: (tab: Tab) => void
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
    description: "Search the full iptv-org channel list and preview streams.",
    color: "text-sport-green",
    metric: "2500+",
    metricLabel: "channels",
  },
  {
    id: "sports" as Tab,
    icon: Trophy,
    title: "Live Sports",
    description: "Browse live and upcoming matches with embedded stream sources.",
    color: "text-sport-yellow",
    metric: "8",
    metricLabel: "sports",
  },
]

const stats = [
  { label: "IPTV channels", value: "2500+", icon: Radio, color: "text-accent-light" },
  { label: "Sports categories", value: "8", icon: Trophy, color: "text-sport-yellow" },
  { label: "Open source", value: "100%", icon: Heart, color: "text-sport-red" },
  { label: "Live-ready", value: "HLS", icon: Wifi, color: "text-sport-green" },
]

const sourceCards = [
  {
    title: "iptv-org/iptv",
    href: "https://github.com/iptv-org/iptv",
    icon: Globe,
    description: "Community-maintained M3U playlists powering the IPTV catalog.",
    tags: ["M3U", "Open source", "Global"],
    tone: "text-sport-green",
  },
  {
    title: "SportSRC API",
    href: "https://sportsrc.org",
    icon: Trophy,
    description: "Match schedules and stream embeds for live sports categories.",
    tags: ["REST API", "Streams", "Sports"],
    tone: "text-sport-yellow",
  },
]

const stack = [
  { name: "React 19", icon: Code2 },
  { name: "TypeScript", icon: Search },
  { name: "Tailwind CSS", icon: Palette },
  { name: "Vite", icon: Zap },
  { name: "HLS.js", icon: Monitor },
  { name: "Lucide", icon: Gauge },
]

export default function HomePage({ onNavigate }: HomePageProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const panelClass = isDark
    ? "bg-dark-300/30 border-white/[0.06]"
    : "bg-white border-slate-200"

  const mutedText = isDark ? "text-dark-100" : "text-slate-500"
  const strongText = isDark ? "text-white" : "text-slate-900"

  return (
    <div className="flex flex-col gap-5 sm:gap-6 xl:h-full">
      <section className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-extrabold ${strongText}`}>
                StreamHub
              </h1>
              <p className={`mt-1 max-w-2xl text-sm sm:text-base ${mutedText}`}>
                IPTV, channel discovery, and live sports in one focused dashboard.
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

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap className={`w-4 h-4 ${mutedText}`} />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedText}`}>
            Open A Section
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
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

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Heart className={`w-4 h-4 ${mutedText}`} />
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedText}`}>
              Data Sources
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className={`w-4 h-4 ${mutedText}`} />
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedText}`}>
              Built With
            </h2>
          </div>

          <div className={`rounded-2xl border p-4 ${panelClass}`}>
            <div className="grid grid-cols-2 gap-2">
              {stack.map((tech) => (
                <div
                  key={tech.name}
                  className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                    isDark ? "bg-white/5 text-dark-100" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <tech.icon className="w-4 h-4 shrink-0 text-accent-light" />
                  <span className="truncate">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
