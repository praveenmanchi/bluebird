import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import type { Snapshot } from '@shared/design/types'
import { decodeBase64 } from '@shared/github/base64'
import { parseDay } from '@shared/history/store'
import type { HistoryEntry } from '@shared/history/types'
import { CHANGELOG, type ApproveResult, type ChangelogContext, type ChangelogDraft, type SubmitResult } from '../messages'
import { NOT_A_BRANCH, NO_KEY, NO_TOKEN, createChangelogHandlers } from '../sandbox/changelog-handlers'

const LOCAL: Snapshot = {
  takenAt: '2026-11-12T10:00:00.000Z',
  variables: [{ id: 'v1', name: 'button/bg', collection: 'Brand UI', type: 'color', values: { Bridge: '#0052CC' }, description: '' }],
  components: [{ id: 'k-button', nodeId: '1:2', name: 'Button', page: 'Atoms', variants: 2, properties: ['State'], description: '', usesVariables: ['v1'] }],
}

interface Options { fileKey?: string | null; token?: string; branch?: boolean; storage?: boolean; drawFails?: boolean; conflicts?: number; figmaDown?: boolean }

function setup({ fileKey = 'BRANCH', token = 'figd_x', branch = true, storage = true, drawFails = false, conflicts = 0, figmaDown = false }: Options = {}) {
  const files = new Map<string, string>()
  const drawn: HistoryEntry[] = []
  const tokens = new Set<string>()
  let pending = conflicts
  let clock = Date.parse('2026-11-12T12:00:00.000Z')
  const reply = (status: number, body: unknown) => ({ status, text: async () => JSON.stringify(body) })
  const handlers = createChangelogHandlers({
    readSnapshot: async () => LOCAL,
    readDualFile: async () => ({ ...DEFAULT_INTEGRATIONS.dualFile, file1Id: 'LIB', file1Key: token, extraFiles: [{ id: 'MAIN', key: token ? 'figd_main' : '', role: 'Variables' }] }),
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo: 'acme/ds', branch: 'main', apiKey: storage ? 'ghp_x' : '' }),
    readStorage: async () => DEFAULT_INTEGRATIONS.storage,
    fetch: async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
      if (url.startsWith('https://api.figma.com/')) {
        if (figmaDown) return reply(500, { err: 'boom' })
        tokens.add(init.headers['X-Figma-Token'] ?? '')
        if (url.includes('/files/BRANCH?')) return reply(200, branch ? { name: 'button-refresh', mainFileKey: 'MAIN' } : { name: 'Library' })
        if (url.endsWith('/files/MAIN/meta')) return reply(200, { file: { name: 'Project Bluebird UI' } })
        if (url.endsWith('/variables/local')) return reply(200, { meta: { variableCollections: { c: { id: 'c', name: 'Brand UI', defaultModeId: 'm', modes: [{ modeId: 'm', name: 'Bridge' }] } }, variables: { v1: { id: 'v1', key: 'k', name: 'button/bg', variableCollectionId: 'c', resolvedType: 'COLOR', valuesByMode: { m: { r: 0, g: 0.4, b: 1, a: 1 } } } } } })
        if (url.includes('/nodes?')) return reply(200, { nodes: { '1:2': null } })
        if (url.endsWith('/component_sets')) return reply(200, { meta: { component_sets: [] } })
        return reply(200, { meta: { components: [] } })
      }
      const path = decodeURIComponent(/\/contents\/([^?]+)/.exec(url)?.[1] ?? '')
      if (init.method === 'PUT') {
        if (path.endsWith('.md') && pending > 0) { pending -= 1; return reply(409, { message: 'is at a different sha' }) }
        files.set(path, decodeBase64((JSON.parse(init.body ?? '{}') as { content: string }).content))
        return reply(200, {})
      }
      const text = files.get(path)
      return text === undefined ? reply(404, { message: 'Not Found' }) : reply(200, { content: btoa(unescape(encodeURIComponent(text))), sha: `sha${text.length}` })
    },
    sleep: async () => undefined,
    now: () => new Date(clock += 60_000),
    user: () => 'Praveen Manchi',
    team: async () => 'Design System',
    fileKey: () => fileKey,
    fileName: () => 'button-refresh',
    pageName: () => 'Atoms',
    drawCard: async (entry) => { if (drawFails) throw new Error('no font'); drawn.push(entry) },
  })
  const call = <T>(type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<T>)(payload, {} as HandlerContext)
  const day = () => parseDay(files.get('.bluebird/history/2026-11-12.json') ?? null)
  return {
    files, drawn, tokens, day,
    context: () => call<ChangelogContext>(CHANGELOG.context),
    generate: () => call<ChangelogDraft>(CHANGELOG.generate),
    submit: (over: Record<string, unknown> = {}) => call<SubmitResult>(CHANGELOG.submit, { draftId: 'x', title: 'Button refresh', notes: 'Darker primary.', ticket: 'BB-342', addCard: true, ...over }),
    approve: (e: { id: string; at: string }) => call<ApproveResult>(CHANGELOG.approve, { id: e.id, at: e.at }),
  }
}

describe('changelog handlers', () => {
  it('says where you are and names the main file of a branch', async () => {
    const t = setup()
    expect(await t.context()).toEqual({ file: 'button-refresh', page: 'Atoms', user: 'Praveen Manchi', main: 'Project Bluebird UI' })
    // The main file is a Dual File library with its own key: that key reads it.
    expect([...t.tokens]).toEqual(['figd_x', 'figd_main'])
  })

  it('explains why there is nothing to compare with', async () => {
    expect((await setup({ fileKey: null }).context()).problem).toBe(NO_KEY)
    expect((await setup({ token: '' }).context()).problem).toBe(NO_TOKEN)
    expect((await setup({ branch: false }).context()).problem).toBe(NOT_A_BRANCH)
    expect((await setup({ figmaDown: true }).context()).problem).toMatch(/Figma answered 500/)
    await expect(setup({ branch: false }).generate()).rejects.toThrow(NOT_A_BRANCH)
  })

  it('compares the branch with its main file', async () => {
    const draft = await setup().generate()
    expect(draft.title).toBe('button-refresh')
    expect(draft.warnings).toEqual([])
    expect(draft.changes.map((c) => `${c.subject} ${c.kind} ${c.name} ${c.detail}`)).toEqual(['component added Button New · 2 variants · 1 property', 'variable modified button/bg #0066FF → #0052CC'])
  })

  it('submits what was compared as under review and draws the card', async () => {
    const t = setup()
    const draft = await t.generate()
    const done = await t.submit({ draftId: draft.draftId })
    expect(done).toMatchObject({ card: true, message: 'Submitted for review. Your team sees it in History as Under review. The changelog card is on this page.' })
    const [entry] = t.day()
    expect(entry).toMatchObject({ id: done.id, type: 'changelog', status: 'review', title: 'Button refresh', ticket: 'BB-342', by: { name: 'Praveen Manchi', team: 'Design System' }, variables: '1 modified', components: '1 added' })
    expect(t.drawn.map((e) => e.id)).toEqual([done.id])
    await expect(t.submit({ draftId: draft.draftId })).rejects.toThrow(/Generate the changelog again/)
  })

  it('keeps the entry when the card can’t be drawn, and skips the card when asked', async () => {
    const t = setup({ drawFails: true })
    expect((await t.submit({ draftId: (await t.generate()).draftId })).message).toMatch(/could not be drawn/)
    expect(t.day()).toHaveLength(1)
    const quiet = setup()
    const done = await quiet.submit({ draftId: (await quiet.generate()).draftId, addCard: false, ticket: '' })
    expect(done).toMatchObject({ card: false, message: 'Submitted for review. Your team sees it in History as Under review.' })
    expect(quiet.drawn).toEqual([])
  })

  it('refuses a submit it did not compare, a bad ticket and a missing repository', async () => {
    const t = setup()
    await expect(t.submit()).rejects.toThrow(/Generate the changelog again/)
    await expect(t.submit({ ticket: 'not a key' })).rejects.toThrow()
    const off = setup({ storage: false })
    await expect(off.submit({ draftId: (await off.generate()).draftId })).rejects.toThrow(/Settings › GitHub/)
  })

  it('approves: the entry is done and the shared changelog file gets it on top', async () => {
    const t = setup({ conflicts: 1 })
    await t.submit({ draftId: (await t.generate()).draftId })
    const [pending] = t.day()
    const done = await t.approve(pending!)
    expect(done.message).toBe('Approved. “Button refresh” is now in acme/ds · .bluebird/DESIGN-CHANGELOG.md.')
    expect(t.day()).toHaveLength(1)
    expect(t.day()[0]).toMatchObject({ status: 'done', review: { by: 'Praveen Manchi' }, link: { url: 'https://github.com/acme/ds/blob/main/.bluebird/DESIGN-CHANGELOG.md' } })
    const md = t.files.get('.bluebird/DESIGN-CHANGELOG.md')!
    expect(md.startsWith('# Design changelog\n\n## 2026-11-12 · Button refresh (BB-342)')).toBe(true)
    expect(md).toContain('- Approved by: Praveen Manchi')
    await expect(t.approve(pending!)).rejects.toThrow('Praveen Manchi already approved this changelog.')
    await expect(t.approve({ id: 'missing1', at: pending!.at })).rejects.toThrow(/no longer in the team history/)
  })

  it('leaves the entry under review when the changelog file can’t be written', async () => {
    const t = setup({ conflicts: 99 })
    await t.submit({ draftId: (await t.generate()).draftId })
    await expect(t.approve(t.day()[0]!)).rejects.toThrow()
    expect(t.day()[0]!.status).toBe('review')
  })
})
