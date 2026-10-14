// Avoid counting a paused/ended player as a stall, and avoid rapid retry loops.
export function shouldRecoverStall(input: {
  paused: boolean; ended: boolean; lastProgressAt: number; lastRecoveryAt: number; now: number
}): boolean {
  return !input.paused && !input.ended && input.now - input.lastProgressAt >= 20_000 && input.now - input.lastRecoveryAt >= 30_000
}

export function hasPlaybackProgress(currentTime: number, previousTime: number, readyState: number): boolean {
  return readyState >= 2 && Math.abs(currentTime - previousTime) > 0.1
}
