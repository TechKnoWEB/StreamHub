# StreamHub - IPTV Dashboard & Music Portal

A free, open-source dashboard for streaming live TV, browsing community playlists, watching sports, and listening to music — all in one place.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite)

---

## Features

### IPTV & Live TV
- **IPTV Player** — Stream curated free IPTV channels with a built-in HLS player. Quality badges, category filters, and real-time connection status. Live match notifications from the Sports section.
- **IPTV Catalog** — Browse 4,000+ community-maintained channels from [iptv-org/iptv](https://github.com/iptv-org/iptv) and [Free-TV/IPTV](https://github.com/Free-TV/IPTV) with automatic deduplication. Search by name, filter by category or country.
- **Live Sports** — Dual-source sports streaming engine ([StreamFree](https://streamfree.top) + [ESportex](https://api.esportex.site) fallback). Covers football, basketball, NFL, hockey, baseball, motorsport, UFC/boxing, tennis, and cricket. Stream embeds with multi-source redundancy, language switching, and HD tags. Automatically cross-references with the IPTV player for one-click live match viewing.

### Stream Music

- **Internet Radio** — Browse 45,000+ radio stations from 200+ countries via the free [Radio Browser API](https://www.radio-browser.info). Search by name, filter by genre or country.
- **YouTube Music** — Search and play YouTube music directly in the browser via the [Invidious API](https://invidious.io) (privacy-friendly, no API key needed).
- **Persistent Player Bar** — Always-visible bottom player with play/pause, skip, seek, volume, shuffle, repeat, and queue management.
- **YouTube IFrame API** — Full integration with YouTube's IFrame API for real-time progress sync, seeking, and playback control.
- **Background Playback** — Media Session API keeps audio playing when minimized. Lock screen controls on Android.
- **Mobile Expanded Player** — Bottom sheet with large album art, full controls, volume slider, and queue view with frosted glass backdrop.
- **Playlists & Queue** — Create custom playlists, manage queue (play next, clear), shuffle & repeat. All persisted to localStorage.
- **Favorites & History** — Heart any track to save it. Auto-tracks last 50 played tracks.
- **Keyboard Shortcuts** — Full keyboard control: Space (play/pause), arrows (seek/skip), M (mute), S (shuffle), R (repeat).

### General
- **PWA** — Installable on mobile/desktop. Works offline for cached content. Service worker with auto-update.
- **Dark / Light Mode** — Full theme support with smooth transitions and persistent preference.
- **Responsive Design** — Mobile-first. Bottom navigation on mobile, sidebar on desktop. Safe-area insets for notched devices.


---
## Screenshots
<img width="1431" height="759" alt="image" src="https://github.com/user-attachments/assets/db785ace-ffc6-4959-8bf4-19a20f29cb94" />
<img width="1433" height="756" alt="image" src="https://github.com/user-attachments/assets/5b6953e6-45f6-4d34-9350-9e86d856dafc" />
<img width="1433" height="759" alt="image" src="https://github.com/user-attachments/assets/78c646b2-fdd1-4247-ba18-679ea277d3ed" />


## Mobile & Responsive

| Feature | Behavior |
|---------|----------|
| Player bar | Full-width bottom bar with thin progress indicator + touch seek |
| Expanded player | 92dvh bottom sheet with backdrop blur, swipe handle, large artwork |
| Genre/Country filters | Compact chips, 6 visible by default, "show more" toggle |
| Track actions | Add to queue, favorite, and more menu always visible on mobile |
| Queue panel | Full-width bottom sheet on mobile, floating panel on desktop |
| Recently Played | Stacked list with inline delete button |
| YouTube player | Responsive floating overlay, minimizable to bottom-right corner |

---

## Background Playback

| Platform | Support |
|----------|---------|
| Chrome Android | Full — notification controls, lock screen, headphone buttons |
| Chrome Desktop | Full — tab audio indicator |
| iOS Safari | After user gesture — lock screen controls, headphone buttons |
| Samsung Internet | Full — notification controls |

Powered by the **Media Session API** — the same technology used by Spotify and YouTube Music.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 6.0 |
| Styling | Tailwind CSS 3.4 |
| Build Tool | Vite 8 |
| Animation | Framer Motion |
| Video Player | HLS.js |
| YouTube | YouTube IFrame API |
| Media Controls | Media Session API |
| Icons | Lucide React |

---

## Data Sources

| Source | Description | Coverage | License |
|--------|-------------|----------|---------|
| [iptv-org/iptv](https://github.com/iptv-org/iptv) | Community-curated IPTV channels (category-grouped) | 2,500+ | MIT |
| [Free-TV/IPTV](https://github.com/Free-TV/IPTV) | Country-organized IPTV channels (80+ countries) | 1,800+ | MIT |
| [StreamFree](https://streamfree.top) | Primary sports source — live-only streams with real viewer counts & badges | — | Free API |
| [ESportex](https://api.esportex.site) | Secondary sports source — fallback for upcoming + live events | — | Free API |
| [Radio Browser](https://www.radio-browser.info) | Free, open-source database of internet radio stations | 45,000+ | CC0 |
| [Invidious](https://invidious.io) | Privacy-friendly YouTube frontend for music search | — | AGPL-3.0 |

> **Deduplication:** IPTV M3U sources are merged at runtime. Duplicate streams (same URL) are automatically removed (~4,000+ unique channels). Sports matches are deduplicated by title across both sources.


---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (recommended 20+)
- npm or yarn or pnpm


### Installation

```bash
# Clone the repository
git clone https://github.com/TechKnoWEB/StreamHub.git
cd StreamHub

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── HomePage.tsx              # Landing page
│   ├── LiveStreams.tsx            # IPTV player + live match integration
│   ├── IPTVChannels.tsx           # Multi-source channel catalog
│   ├── LiveSports.tsx             # Dual-source sports engine
│   ├── LegalDisclaimer.tsx        # Legal & terms
│   ├── AboutPage.tsx              # About page
│   ├── Sidebar.tsx                # Desktop navigation sidebar
│   ├── BottomNav.tsx              # Mobile bottom navigation
│   ├── PWAInstallBanner.tsx       # PWA install prompt
│   ├── VideoPlayer.tsx            # HLS video player
│   └── SportsPlayer.tsx           # Sports stream embed player
├── music/
│   ├── types.ts                   # Music-specific types
│   ├── MusicContext.tsx           # Global music state
│   ├── hooks/
│   │   ├── useAudioPlayer.ts      # HTML5 Audio controller
│   │   ├── useYouTubePlayer.ts    # YouTube IFrame API controller
│   │   ├── useRadioBrowser.ts     # Radio Browser API integration
│   │   └── useYouTubeSearch.ts    # YouTube search via Invidious
│   └── components/
│       ├── MusicPortal.tsx        # Main music page
│       ├── MusicPlayer.tsx        # Persistent bottom player
│       ├── TrackCard.tsx          # Reusable track row
│       ├── InternetRadio.tsx      # Radio station browser
│       ├── YouTubeSearch.tsx      # YouTube music search
│       └── YouTubeEmbed.tsx       # YouTube IFrame player
├── context/
│   ├── ThemeContext.tsx            # Dark/light theme
│   └── LiveStreamContext.tsx       # Shared live match state
├── types.ts                       # Shared TypeScript interfaces
├── App.tsx                        # Root with hash routing
├── main.tsx                       # Entry point
└── index.css                      # Global styles
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## How It Works

### IPTV Player
Loads curated free IPTV channels (beIN Sports, Fox Sports, etc.) and streams them via HLS.js through a local proxy to handle CORS. When a live football match is available from the Sports section, a prominent red "Live Match" card appears at the top of the channel list.

### IPTV Catalog
Fetches M3U playlists from **two sources** in parallel (iptv-org + Free-TV), deduplicates by stream URL, and merges into a single unified catalog. Supports search, category filtering, and country filtering.

### Live Sports
Connects to the SportSRC API to display upcoming match schedules across 9 sport categories. Selecting a match loads embedded stream players directly from `embed.st`.

### Stream Music
The music portal connects to two free APIs:
- **Radio Browser API** — No authentication required. Search 45K+ stations by name, genre, or country. Streams play directly via HTML5 Audio with Media Session API integration.
- **Invidious API** — Privacy-friendly YouTube frontend. Searches YouTube for music videos and plays them via the YouTube IFrame API for full playback control.

All user data (volume, favorites, playlists, recently played) is persisted to `localStorage` under the `streamhub-music` key.

### URL Hash Routing
Active tab state is stored in the URL hash (`#home`, `#iptv`, `#catalog`, `#sports`, `#music`). Refreshing the page restores the last-viewed section. Browser back/forward navigation works correctly.

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgments

- [iptv-org/iptv](https://github.com/iptv-org/iptv) — Community-curated IPTV channel lists
- [Free-TV/IPTV](https://github.com/Free-TV/IPTV) — Country-organized IPTV channels
- [SportSRC](https://sportsrc.org) — Free sports streaming API
- [Radio Browser](https://www.radio-browser.info) — Free internet radio station database
- [Invidious](https://invidious.io) — Privacy-friendly YouTube frontend
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) — YouTube player integration
- [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) — Background playback & lock screen controls
- [HLS.js](https://github.com/video-dev/hls.js) — HTTP Live Streaming client
- [Lucide](https://lucide.dev) — Beautiful open-source icons
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) — Animation library for React

