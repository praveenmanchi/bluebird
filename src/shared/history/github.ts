// Reads and writes History entries in the Storage repository (see config.ts).
// Runs in the sandbox, the only side with the token.
import { GithubError, type GithubClient } from '@shared/github/client'
import { appendToDay, dayOf, daysInRange, parseDay } from './store'
import type { HistoryEntry } from './types'

/** Times a write is retried when someone else wrote the same day file first. */
export const APPEND_ATTEMPTS = 4
/** Day files fetched at once. */
const PARALLEL = 6

const dayFile = (folder: string, iso: string) => `${folder}/${dayOf(iso)}.json`

export async function appendEntry(client: GithubClient, branch: string, folder: string, entry: HistoryEntry): Promise<void> {
  const path = dayFile(folder, entry.at)
  for (let attempt = 1; ; attempt++) {
    const current = await client.readFileWithSha(path, branch)
    try {
      await client.putFile(path, appendToDay(parseDay(current?.text ?? null), entry), `chore(history): ${entry.type} · ${entry.title}`.slice(0, 120), branch, current?.sha)
      return
    } catch (e) {
      // 409 / 422 here means the file moved on since we read it: read it again and retry.
      const conflict = e instanceof GithubError && (e.kind === 'rejected' || e.kind === 'exists')
      if (!conflict || attempt >= APPEND_ATTEMPTS) throw e
    }
  }
}

/** Day files already read, by name: a file whose sha hasn't changed isn't fetched again. */
export type DayCache = Map<string, { sha: string; entries: HistoryEntry[] }>

/** Every entry from `days` days ago (UTC) until now, newest first. */
export async function listEntries(client: GithubClient, branch: string, folder: string, days: number, now: Date, cache: DayCache = new Map()): Promise<{ entries: HistoryEntry[]; fetched: number }> {
  const since = dayOf(new Date(now.getTime() - (days - 1) * 86_400_000).toISOString())
  const listing = await client.listFolder(folder, branch)
  const shaOf = new Map(listing.map((f) => [f.name, f.sha]))
  const wanted = daysInRange(listing.map((f) => f.name), since)
  const stale = wanted.filter((d) => cache.get(d)?.sha !== shaOf.get(`${d}.json`))
  for (let i = 0; i < stale.length; i += PARALLEL) {
    const batch = stale.slice(i, i + PARALLEL)
    const raws = await Promise.all(batch.map((d) => client.readFile(`${folder}/${d}.json`, branch)))
    batch.forEach((d, k) => cache.set(d, { sha: shaOf.get(`${d}.json`) ?? '', entries: parseDay(raws[k] ?? null) }))
  }
  const entries = wanted.flatMap((d) => cache.get(d)?.entries ?? []).sort((a, b) => b.at.localeCompare(a.at))
  return { entries, fetched: stale.length }
}
