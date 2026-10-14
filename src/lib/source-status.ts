export interface SourceStatus {
  name: string
  count: number
  error: string | null
}

export async function loadSource<T>(name: string, load: () => Promise<T[]>): Promise<{
  items: T[]
  status: SourceStatus
}> {
  try {
    const items = await load()
    return { items, status: { name, count: items.length, error: null } }
  } catch (error: unknown) {
    let message = "Could not load this source"
    if (error instanceof Error) {
      if (error.name === "TimeoutError") message = "Request timed out"
      else if (error.name === "TypeError" && /fetch|network|load failed/i.test(error.message)) message = "Could not connect to this source"
      else message = error.message || message
    }
    return { items: [], status: { name, count: 0, error: message } }
  }
}

export function emptyListingMessage(statuses: SourceStatus[]): string {
  const failed = statuses.filter((source) => source.error !== null).length
  if (statuses.length > 0 && failed === statuses.length) return "Unable to load matches"
  if (failed > 0) return "No listings from available sources"
  return "No matches listed by the sources"
}
