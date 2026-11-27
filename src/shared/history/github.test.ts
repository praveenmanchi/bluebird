import { describe, it, expect } from 'vitest'
import { githubCodeHost } from '@shared/codehost/github'
import { APPEND_ATTEMPTS, appendEntry, listEntries, type DayCache } from './github'
import type { HistoryEntry } from './types'

const F = '.bluebird/history'
const entry = (id: string, at: string): HistoryEntry => ({ schema: 1, id, type: 'mcp', status: 'done', title: 'Checkout', summary: 'Pushed', at, by: { name: 'Anita' }, file: 'IKEA Web' })

/** Files on one branch; `racer` writes before the next PUT lands, like a teammate recording at the same moment. */
function fakeRepo() {
  const files = new Map<string, string>()
  let racer: (() => void) | null = null
  const reply = (status: number, body: unknown) => ({ status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) })
  const sha = (t: string) => `s${t.length}-${[...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)}`
  const reads: string[] = []
  const fetch = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const m = /\/contents\/([^?]+)/.exec(url)
    const path = m ? decodeURIComponent(m[1]!) : ''
    if (init.method === 'GET') {
      reads.push(path)
      const text = files.get(path)
      if (text === undefined) {
        const names = [...files.keys()].filter((p) => p.startsWith(`${path}/`)).map((p) => ({ name: p.slice(path.length + 1), type: 'file', sha: sha(files.get(p)!) }))
        return names.length ? reply(200, names) : reply(404, { message: 'Not Found' })
      }
      return (init.headers.Accept ?? '').includes('raw') ? reply(200, text) : reply(200, { content: Buffer.from(text).toString('base64'), sha: sha(text) })
    }
    const body = JSON.parse(init.body!) as { content: string; sha?: string }
    if (racer) { const r = racer; racer = null; r() }
    const current = files.get(path)
    if (current !== undefined && body.sha !== sha(current)) return reply(409, { message: 'is at a different sha' })
    files.set(path, Buffer.from(body.content, 'base64').toString('utf8'))
    return reply(200, {})
  }
  const client = githubCodeHost({ kind: 'github', api: 'https://api.github.com', web: 'https://github.com', email: '', token: 't', repo: 'acme/history', branch: 'main', tokenPath: 'tokens.json' }, fetch, async () => undefined)
  return { files, client, reads, race: (fn: () => void) => { racer = fn } }
}

describe('history on GitHub', () => {
  it('appends to the day file and lists the range newest first', async () => {
    const r = fakeRepo()
    await appendEntry(r.client, 'main', F, entry('aaaaaa1', '2026-11-12T09:00:00.000Z'))
    await appendEntry(r.client, 'main', F, entry('bbbbbb2', '2026-11-12T10:00:00.000Z'))
    await appendEntry(r.client, 'main', F, entry('cccccc3', '2026-11-02T10:00:00.000Z'))
    expect([...r.files.keys()].sort()).toEqual(['.bluebird/history/2026-11-02.json', '.bluebird/history/2026-11-12.json'])
    const week = (await listEntries(r.client, 'main', F, 7, new Date('2026-11-12T12:00:00.000Z'))).entries
    expect(week.map((e) => e.id)).toEqual(['bbbbbb2', 'aaaaaa1'])
    const month = (await listEntries(r.client, 'main', F, 30, new Date('2026-11-12T12:00:00.000Z'))).entries
    expect(month.map((e) => e.id)).toEqual(['bbbbbb2', 'aaaaaa1', 'cccccc3'])
  })

  it('keeps both entries when a teammate writes the same day file first', async () => {
    const r = fakeRepo()
    await appendEntry(r.client, 'main', F, entry('aaaaaa1', '2026-11-12T09:00:00.000Z'))
    r.race(() => { void appendEntry(r.client, 'main', F, entry('teammate', '2026-11-12T09:30:00.000Z')) })
    await appendEntry(r.client, 'main', F, entry('bbbbbb2', '2026-11-12T10:00:00.000Z'))
    await new Promise((res) => setTimeout(res, 0))
    const ids = (await listEntries(r.client, 'main', F, 1, new Date('2026-11-12T12:00:00.000Z'))).entries.map((e) => e.id)
    expect(ids.sort()).toEqual(['aaaaaa1', 'bbbbbb2', 'teammate'])
  })

  it('gives up after a few conflicts in a row', async () => {
    const r = fakeRepo()
    await appendEntry(r.client, 'main', F, entry('aaaaaa1', '2026-11-12T09:00:00.000Z'))
    let n = 0
    const keepRacing = () => { n++; r.files.set('.bluebird/history/2026-11-12.json', `{"entries":[],"n":${n}}`); r.race(keepRacing) }
    r.race(keepRacing)
    await expect(appendEntry(r.client, 'main', F, entry('bbbbbb2', '2026-11-12T10:00:00.000Z'))).rejects.toThrow()
    expect(n).toBe(APPEND_ATTEMPTS)
  })
  it('only re-reads day files whose sha changed', async () => {
    const r = fakeRepo()
    const now = new Date('2026-11-12T12:00:00.000Z')
    await appendEntry(r.client, 'main', F, entry('aaaaaa1', '2026-11-11T09:00:00.000Z'))
    await appendEntry(r.client, 'main', F, entry('bbbbbb2', '2026-11-12T09:00:00.000Z'))
    const cache: DayCache = new Map()
    expect((await listEntries(r.client, 'main', F, 7, now, cache)).fetched).toBe(2)
    expect((await listEntries(r.client, 'main', F, 7, now, cache)).fetched).toBe(0)
    await appendEntry(r.client, 'main', F, entry('cccccc3', '2026-11-12T10:00:00.000Z'))
    const third = await listEntries(r.client, 'main', F, 7, now, cache)
    expect(third.fetched).toBe(1)
    expect(third.entries.map((e) => e.id)).toEqual(['cccccc3', 'bbbbbb2', 'aaaaaa1'])
  })
})
