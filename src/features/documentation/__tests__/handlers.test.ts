import { describe, it, expect, vi } from 'vitest'
import type { HandlerContext } from '@shared/bridge'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { BUTTON, BUTTON_CHANGED, PAGES, SCANS } from '../fixtures'
import { MSG, type SelectionResult, type TicketsResult } from '../messages'
import { DOCS_PAGE, createDocumentationHandlers, type DocumentationDeps } from '../sandbox/doc-handlers'
import type { DocPage } from '../sandbox/canvas'
import type { AuditResult, ComponentDoc, HandoffResult, ProgressStep } from '../types'

const JIRA = { ...DEFAULT_INTEGRATIONS.jira, enabled: true, siteUrl: 'https://acme.atlassian.net', email: 'p@acme.com', apiKey: 'jira-token', projectKey: 'BB' }

function setup(overrides: Partial<DocumentationDeps> = {}) {
  const store = new Map<string, string>()
  const drawn: DocPage[] = []
  const located: string[] = []
  const emitted: ProgressStep[][] = []
  let selected: typeof BUTTON | null = BUTTON
  const deps: DocumentationDeps = {
    readSelection: async () => selected,
    readComponent: async () => BUTTON,
    stored: { get: async (id) => store.get(id) ?? '', set: async (id, value) => { store.set(id, value) } },
    listPages: async () => [...PAGES],
    scanPages: vi.fn(async (ids: readonly string[]) => ids.flatMap((id) => SCANS[id] ? [SCANS[id]!] : [])),
    draw: async (page) => { drawn.push(page); return `frame:${drawn.length}` },
    locate: async (id) => { located.push(id) },
    readJira: async () => JIRA,
    fetch: vi.fn(async () => ({ status: 200, text: async () => JSON.stringify({ issues: [{ key: 'BB-1', fields: { summary: 'One', status: { name: 'To Do' } } }] }) })),
    version: 'V9', now: () => new Date('2026-11-15T10:00:00.000Z'), user: () => 'Sam',
    ...overrides,
  }
  const handlers = createDocumentationHandlers(deps)
  const ctx = { emit: (_type: string, payload: { steps: ProgressStep[] }) => { emitted.push(payload.steps) } } as unknown as HandlerContext
  const call = <T>(type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<T>)(payload, ctx)
  return { call, deps, store, drawn, located, emitted, select: (next: typeof BUTTON | null) => { selected = next } }
}

const REQUEST = { nodeId: BUTTON.summary.nodeId, sections: ['anatomy', 'properties', 'tokens', 'brands', 'a11y', 'code'], frame: true }

describe('documentation handlers · components', () => {
  it('reports nothing selected', async () => {
    const t = setup()
    t.select(null)
    expect(await t.call<SelectionResult>(MSG.selection)).toEqual({ status: 'none' })
  })

  it('reports an undocumented component', async () => {
    const result = await setup().call<SelectionResult>(MSG.selection)
    expect(result).toMatchObject({ status: 'component', doc: null, changes: [] })
  })

  it('generates, draws the frame, stores the doc and streams progress', async () => {
    const t = setup()
    const doc = await t.call<ComponentDoc>(MSG.generate, REQUEST)
    expect(doc).toMatchObject({ name: 'Button', version: 'V9', generatedAt: '2026-11-15T10:00:00.000Z', frameId: 'frame:1' })
    expect(t.drawn[0]).toMatchObject({ pageName: DOCS_PAGE, frameName: 'Doc · Button', title: 'Button' })
    expect(t.drawn[0]!.blocks.map((b) => b.heading)).toEqual(['Anatomy', 'Properties and variants', 'Tokens used', 'Brand differences · button/primary/bg/default', 'Accessibility', 'Code'])
    expect(JSON.parse(t.store.get(BUTTON.summary.nodeId)!)).toMatchObject({ fingerprint: doc.fingerprint, preview: null })
    expect(t.emitted.at(-1)!.map((s) => s.status)).toEqual(['done', 'done', 'done', 'running'])
    expect(t.emitted.at(-1)![0]!.label).toBe('Read 12 variants and 5 properties')
  })

  it('draws only the chosen sections, and no frame when that is off', async () => {
    const t = setup()
    const doc = await t.call<ComponentDoc>(MSG.generate, { ...REQUEST, sections: ['properties'], frame: false })
    expect(doc.frameId).toBeNull()
    expect(t.drawn).toEqual([])
    await t.call(MSG.generate, { ...REQUEST, sections: ['properties'] })
    expect(t.drawn[0]!.blocks.map((b) => b.heading)).toEqual(['Properties and variants'])
  })

  it('returns the stored doc as up to date, then out of date once the component changes', async () => {
    const t = setup()
    await t.call(MSG.generate, REQUEST)
    expect(await t.call<SelectionResult>(MSG.selection)).toMatchObject({ status: 'component', doc: { name: 'Button' }, changes: [] })
    t.select(BUTTON_CHANGED)
    const stale = await t.call<SelectionResult>(MSG.selection)
    expect(stale.status === 'component' && stale.changes).toEqual(['18 variants, was 12', 'Size is now Small · Medium · Large', 'button/primary/radius 6 → 8'])
  })

  it('ignores plugin data it cannot read', async () => {
    const t = setup()
    t.store.set(BUTTON.summary.nodeId, '{not json')
    expect(await t.call<SelectionResult>(MSG.selection)).toMatchObject({ doc: null })
    t.store.set(BUTTON.summary.nodeId, '{"name":"x"}')
    expect(await t.call<SelectionResult>(MSG.selection)).toMatchObject({ doc: null })
  })

  it('rejects a bad request and a component that is gone', async () => {
    await expect(setup().call(MSG.generate, { nodeId: '', sections: [], frame: true })).rejects.toThrow()
    await expect(setup({ readComponent: async () => null }).call(MSG.generate, REQUEST)).rejects.toThrow('no longer in this file')
  })
})

describe('documentation handlers · hand-off', () => {
  const HANDOFF = { pageIds: ['p:publish'], ticket: { key: 'BB-210', summary: 'Publish flow v2' }, intent: 'Ship it.', audience: 'Development team', version: 'Draft v0.1', include: ['flow', 'screens', 'components', 'issues'], ignored: ['spacing:publish:gap0'] }

  it('lists pages and audits the picked ones', async () => {
    const t = setup()
    expect(await t.call(MSG.pages)).toEqual({ pages: PAGES })
    const audit = await t.call<AuditResult>(MSG.audit, { pageIds: ['p:publish'] })
    expect(audit.findings).toHaveLength(8)
    await expect(t.call(MSG.audit, { pageIds: ['p:gone'] })).rejects.toThrow('no longer in this file')
    await expect(t.call(MSG.audit, { pageIds: [] })).rejects.toThrow()
  })

  it('builds the hand-off from the audited scan and draws its page', async () => {
    const t = setup()
    await t.call(MSG.audit, { pageIds: ['p:publish'] })
    const result = await t.call<HandoffResult>(MSG.handoff, HANDOFF)
    expect(t.deps.scanPages).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ title: 'Handoff · Publish', ticket: 'BB-210', frameId: 'frame:1' })
    const page = t.drawn[0]!
    expect(page).toMatchObject({ pageName: 'Handoff · Publish', frameName: 'Handoff · Publish · Draft v0.1' })
    expect(page.meta).toBe('Draft v0.1 · created 2026-11-15 · by Sam · BB-210')
    expect(page.blocks.map((b) => b.heading)).toEqual(['Summary', 'What’s in it', 'Screens', 'Components used', 'Known issues'])
    expect(page.blocks.at(-1)!.rows).toEqual([['Extract row gap 8 is not bound', 'Publish · Publish · Extract', 'bind a spacing variable (8)']])
    expect(t.emitted.at(-1)!.at(-1)).toEqual({ label: 'Drawing the hand-off page', status: 'running' })
  })

  it('scans again when the hand-off is for other pages, and leaves out unchosen sections', async () => {
    const t = setup()
    const result = await t.call<HandoffResult>(MSG.handoff, { ...HANDOFF, pageIds: ['p:jira'], ticket: null, intent: '', include: [], ignored: [] })
    expect(t.deps.scanPages).toHaveBeenCalledTimes(1)
    expect(result.ticket).toBeNull()
    expect(t.drawn[0]!.blocks.map((b) => b.heading)).toEqual(['Summary', 'What’s in it'])
    expect(t.drawn[0]!.blocks[0]!.rows[0]![0]).toMatch(/^Draft:/)
    await expect(t.call(MSG.handoff, { ...HANDOFF, pageIds: ['p:gone'] })).rejects.toThrow('no longer in this file')
  })

  it('lists Jira tickets, or says what Settings are missing', async () => {
    const result = await setup().call<TicketsResult>(MSG.tickets)
    expect(result).toEqual({ connected: true, tickets: [{ key: 'BB-1', summary: 'One', status: 'To Do' }] })
    const off = await setup({ readJira: async () => ({ ...JIRA, enabled: false }) }).call<TicketsResult>(MSG.tickets)
    expect(off.connected).toBe(false)
  })

  it('posts the summary as a Jira comment', async () => {
    const t = setup()
    expect(await t.call(MSG.post, { key: 'BB-210', text: 'Summary' })).toEqual({ key: 'BB-210' })
    expect(t.deps.fetch).toHaveBeenCalledWith(expect.stringContaining('/issue/BB-210/comment'), expect.objectContaining({ method: 'POST' }))
    await expect(t.call(MSG.post, { key: 'nope', text: 'x' })).rejects.toThrow()
    await expect(setup({ readJira: async () => ({ ...JIRA, enabled: false }) }).call(MSG.post, { key: 'BB-1', text: 'x' })).rejects.toThrow()
  })

  it('locates a layer', async () => {
    const t = setup()
    await t.call(MSG.locate, { nodeId: '1:2' })
    expect(t.located).toEqual(['1:2'])
  })
})
