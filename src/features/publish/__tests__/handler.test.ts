import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import { BASELINE, CURRENT } from '../fixtures'
import { MSG, type ExtractResult, type PublishRequest, type PublishResult, type StatusResult } from '../messages'
import { CHUNK_CHARS, STORE_KEY, createPublishHandlers, readChunked, readStore, writeChunked, type DocumentData } from '../sandbox/publish-handlers'
import { formatValue } from '../sandbox/snapshot'
import type { Snapshot } from '../types'

function memoryData(): DocumentData & { raw: Map<string, string> } {
  const raw = new Map<string, string>()
  return { raw, get: (k) => raw.get(k) ?? '', set: (k, v) => { if (v) raw.set(k, v); else raw.delete(k) } }
}

/** Settings › GitHub with a repository but no token: everything stays in the file. */
function setup(snapshot: Snapshot = CURRENT, repo = 'praveenmanchi/bridge-ds-site') {
  const data = memoryData()
  let current = snapshot
  const events: Array<{ type: string; payload: unknown }> = []
  const ctx: HandlerContext = { emit: (type, payload) => events.push({ type, payload }) } as HandlerContext
  const handlers = createPublishHandlers({
    readSnapshot: async () => current,
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo }),
    data,
    fetch: async () => { throw new Error('no network in tests') },
    sleep: async () => undefined,
    openExternal: () => undefined,
    now: () => new Date('2026-10-11T16:05:00.000Z'),
  })
  const call = (type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<unknown>)(payload, ctx)
  return {
    data, events,
    setSnapshot: (s: Snapshot) => { current = s },
    status: () => call(MSG.status) as Promise<StatusResult>,
    extract: () => call(MSG.extract) as Promise<ExtractResult>,
    publish: (req: PublishRequest) => call(MSG.publish, req) as Promise<PublishResult>,
  }
}

const request = (extract: ExtractResult, overrides: Partial<PublishRequest> = {}): PublishRequest => ({
  extractId: extract.extractId,
  version: 'v1.0.0',
  title: 'First release',
  include: extract.changes.map((c) => c.id),
  notes: [],
  options: { openPr: true, postToTeams: false, tag: true },
  ...overrides,
})

describe('chunked document data', () => {
  it('round-trips values longer than one chunk and clears stale chunks', () => {
    const data = memoryData()
    const long = 'x'.repeat(CHUNK_CHARS * 2 + 10)
    writeChunked(data, 'k', long)
    expect(data.get('k:n')).toBe('3')
    expect(readChunked(data, 'k')).toBe(long)
    writeChunked(data, 'k', 'short')
    expect(readChunked(data, 'k')).toBe('short')
    expect(data.raw.has('k:1') || data.raw.has('k:2')).toBe(false)
  })
  it('reads nothing from an empty or corrupt store', () => {
    const data = memoryData()
    expect(readStore(data)).toBeNull()
    writeChunked(data, STORE_KEY, '{not json')
    expect(readStore(data)).toBeNull()
    writeChunked(data, STORE_KEY, JSON.stringify({ releases: [{ version: 1 }], baseline: {} }))
    expect(readStore(data)).toBeNull()
  })
})

describe('publish handlers', () => {
  it('reports a first release when the file was never published', async () => {
    const t = setup()
    expect(await t.status()).toEqual({ repo: { connected: false, repo: 'praveenmanchi/bridge-ds-site', branch: 'main', problem: 'Add the access token in Settings › GitHub' }, baseline: null, history: [] })
    const x = await t.extract()
    expect(x.baseline).toBeNull()
    expect(x.changes).toHaveLength(CURRENT.variables.length + CURRENT.components.length)
    expect(x.counts).toEqual({ variables: 8, components: 9, modes: 5 })
  })

  it('saves the release in the file, and the next extract diffs against it', async () => {
    const t = setup(BASELINE)
    const first = await t.extract()
    const saved = await t.publish(request(first, { version: 'v3.0.0', title: 'Baseline' }))
    expect(saved.outcome).toBe('saved')
    expect(saved.headline).toBe('v3.0.0 saved in this file')
    expect(saved.message).toContain('Nothing was sent to GitHub: add the access token in Settings › GitHub to publish there.')
    expect(saved.steps.map((s) => s.status)).toEqual(['done', 'done', 'queued', 'queued', 'queued'])
    expect(saved.steps[2]!.detail).toBe('Not run — add the access token in Settings › GitHub')
    expect(t.events.some((e) => e.type === MSG.progress)).toBe(true)

    t.setSnapshot(CURRENT)
    const next = await t.extract()
    expect(next.baseline).toMatchObject({ version: 'v3.0.0', title: 'Baseline', changes: first.changes.length })
    expect(next.changes).toHaveLength(12)
    expect((await t.status()).history.map((h) => h.version)).toEqual(['v3.0.0'])
  })

  it('keeps excluded changes for the next release', async () => {
    const t = setup(BASELINE)
    await t.publish(request(await t.extract(), { version: 'v3.0.0' }))
    t.setSnapshot(CURRENT)
    const x = await t.extract()
    await t.publish(request(x, { version: 'v4.0.0', include: x.changes.map((c) => c.id).filter((id) => id !== 'variable:v6') }))
    const after = await t.extract()
    expect(after.changes.map((c) => c.name)).toEqual(['text/link'])
    expect(after.history.map((h) => h.version)).toEqual(['v4.0.0', 'v3.0.0'])
  })

  it('refuses a stale extract, an empty selection and a malformed request', async () => {
    const t = setup()
    const x = await t.extract()
    await expect(t.publish(request(x, { extractId: 'other' }))).rejects.toThrow('Run the extract again')
    await expect(t.publish(request(x, { include: ['variable:nope'] }))).rejects.toThrow('Pick at least one change')
    await expect(t.publish(request(x, { version: '4.0' }))).rejects.toThrow()
    await t.publish(request(x))
    await expect(t.publish(request(x))).rejects.toThrow('Run the extract again') // one publish per extract
  })

  it('reports the repository as not connected when Settings has none', async () => {
    const t = setup(CURRENT, '  ')
    expect((await t.status()).repo).toEqual({ connected: false, repo: '', branch: 'main', problem: 'Add the repository and access token in Settings › GitHub' })
    const res = await t.publish(request(await t.extract()))
    expect(res.outcome).toBe('saved')
  })
})

describe('formatValue', () => {
  it('formats colours, numbers, text, booleans and aliases', () => {
    const names = new Map([['VariableID:1', 'brand/primary']])
    expect(formatValue({ r: 0.047, g: 0.549, b: 0.914, a: 1 }, names)).toBe('#0C8CE9')
    expect(formatValue({ r: 1, g: 1, b: 1, a: 0.1 }, names)).toBe('#FFFFFF1A')
    expect(formatValue(8, names)).toBe('8')
    expect(formatValue(1 / 3, names)).toBe('0.333')
    expect(formatValue('Noto Sans', names)).toBe('Noto Sans')
    expect(formatValue(true, names)).toBe('true')
    expect(formatValue({ type: 'VARIABLE_ALIAS', id: 'VariableID:1' }, names)).toBe('→ brand/primary')
    expect(formatValue({ type: 'VARIABLE_ALIAS', id: 'lib' }, names)).toBe('→ library variable')
    expect(formatValue(undefined, names)).toBe('—')
  })
})
