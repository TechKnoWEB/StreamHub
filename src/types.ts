export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  category: string
  quality: string
}

export interface M3UChannel {
  id: string
  name: string
  url: string
  logo: string
  category: string
  tvgId: string
  raw: string
}

export interface Match {
  id: string
  title: string
  category: string
  date: number
  popular: boolean
  poster: string
  teams: {
    home: { name: string; badge: string }
    away: { name: string; badge: string }
  }
}

export interface MatchDetail {
  id: string
  title: string
  category: string
  date: number
  popular: boolean
  poster: string
  teams: {
    home: { name: string; badge: string }
    away: { name: string; badge: string }
  }
  sources: {
    id: string
    streamNo: number
    language: string
    hd: boolean
    embedUrl: string
    source: string
    viewers: number
  }[]
}

export interface EmbedSportexIframe {
  server: string
  url: string
}

export interface EmbedSportexMatch {
  slug: string
  tag: string
  kickoff: string
  endTime: string
  poster: string | null
  league: string
  iframes: EmbedSportexIframe[]
}

export interface EmbedSportexResponse {
  success: boolean
  timestamp: number
  football: EmbedSportexMatch[]
  basketball: EmbedSportexMatch[]
  amfootball: EmbedSportexMatch[]
  baseball: EmbedSportexMatch[]
  badminton: EmbedSportexMatch[]
  volleyball: EmbedSportexMatch[]
  tennis: EmbedSportexMatch[]
  race: EmbedSportexMatch[]
  fight: EmbedSportexMatch[]
  hockey: EmbedSportexMatch[]
  rugby: EmbedSportexMatch[]
  cricket: EmbedSportexMatch[]
  other: EmbedSportexMatch[]
}
