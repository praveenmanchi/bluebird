// Fixed-window rate limits, kept in memory. A first line of defence: on
// Cloudflare each isolate counts on its own, so production also gets the
// host's rate-limit rules (roadmap Phase 7).

export type Limiter = (key: string, max: number, windowMs: number) => boolean

const MAX_TRACKED = 10_000

export function createLimiter(now: () => number = Date.now, maxTracked = MAX_TRACKED): Limiter {
  const windows = new Map<string, { start: number; count: number; windowMs: number }>()
  const evictExpired = (at: number) => {
    for (const [key, w] of windows) if (at - w.start >= w.windowMs) windows.delete(key)
  }
  return (key, max, windowMs) => {
    const at = now()
    const current = windows.get(key)
    if (!current || at - current.start >= windowMs) {
      // Bounded memory without ever wiping live counters: drop only finished windows,
      // and refuse new keys while the table is still full.
      if (!current && windows.size >= maxTracked) evictExpired(at)
      if (!current && windows.size >= maxTracked) return false
      windows.set(key, { start: at, count: 1, windowMs })
      return true
    }
    if (current.count >= max) return false
    windows.set(key, { ...current, count: current.count + 1 })
    return true
  }
}
