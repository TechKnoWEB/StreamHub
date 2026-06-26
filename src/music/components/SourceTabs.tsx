import { useTheme } from "../../context/ThemeContext"
import type { MusicSource } from "../types"

interface SourceTabsProps {
  activeSource: MusicSource
  onSourceChange: (source: MusicSource) => void
}

const sources: { id: MusicSource; label: string; emoji: string }[] = [
  { id: "youtube", label: "YouTube Music", emoji: "\uD83C\uDFA5" },
  { id: "radio", label: "Internet Radio", emoji: "\uD83D\uDCFB" },
]

export default function SourceTabs({ activeSource, onSourceChange }: SourceTabsProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className={`flex gap-1 p-1 rounded-xl ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
      {sources.map((source) => (
        <button
          key={source.id}
          onClick={() => onSourceChange(source.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeSource === source.id
              ? isDark
                ? "bg-accent/20 text-accent-light border border-accent/30 shadow-sm shadow-accent/10"
                : "bg-white text-accent-dark border border-accent/20 shadow-sm"
              : isDark
                ? "text-dark-100 hover:text-white hover:bg-white/5"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          }`}
        >
          <span>{source.emoji}</span>
          <span>{source.label}</span>
        </button>
      ))}
    </div>
  )
}
