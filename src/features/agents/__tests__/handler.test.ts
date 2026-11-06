import { describe, it, expect, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { isMessageType } from '@shared/bridge/messages'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { AiFetch } from '@shared/ai'
import { createAgentsHandlers } from '../sandbox/handler'
import { MSG, type ApplyResult, type ChatResult, type RunResult, type ScopeInfo } from '../messages'

const ctx = { emit: vi.fn() }
const handlers = (ai = DEFAULT_INTEGRATIONS.ai, fetch: AiFetch = async () => ({ status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: 'OK' }] }) })) =>
  createAgentsHandlers({ readAi: async () => ai, fetch })
const call = <T>(h: ReturnType<typeof handlers>, type: string, payload: unknown) => h[type]!(payload as never, ctx) as Promise<T>

/** A page with one frame holding a grey label on white, a 16px icon button and a raw-filled card. */
function page() {
  const label = {
    id: 'txt', type: 'TEXT', name: 'Label', visible: true, opacity: 1, characters: 'Pay now', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 14, fontWeight: 400,
    width: 60, height: 20, textAutoResize: 'WIDTH_AND_HEIGHT', textTruncation: 'DISABLED', maxLines: null, textStyleId: '', boundVariables: {},
    fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 }], parent: null as unknown,
    setRangeFills: vi.fn(),
  }
  const icon = { id: 'icon', type: 'INSTANCE', name: 'Close', visible: true, opacity: 1, width: 16, height: 16, fills: [], strokes: [], reactions: [{}], children: [], boundVariables: {}, parent: null as unknown, getMainComponentAsync: async () => ({ name: 'Icon button', remote: true, parent: null }) }
  const card = {
    id: 'card', type: 'FRAME', name: 'Card', visible: true, opacity: 1, width: 300, height: 100, layoutMode: 'VERTICAL', itemSpacing: 13, paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8, cornerRadius: 6,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }], strokes: [], boundVariables: {}, detachedInfo: null, children: [label, icon], parent: null as unknown, absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 100 },
  }
  label.parent = card
  icon.parent = card
  const pageNode = { type: 'PAGE', name: 'Checkout', selection: [card], children: [card] }
  card.parent = pageNode
  return { label, icon, card, pageNode }
}

describe('agents sandbox handlers', () => {
  it('registers only message types the bridge accepts', () => {
    expect(Object.keys(handlers()).filter((t) => !isMessageType(t))).toEqual([])
  })

  it('describes the scope and says when nothing is selected', async () => {
    const { pageNode } = page()
    installFigmaMock({ currentPage: pageNode as never })
    expect(await call<ScopeInfo>(handlers(), MSG.scope, { scope: 'selection' })).toEqual({ scope: 'selection', name: 'Card', frames: 1, layers: 3, textLayers: 1, instances: 1, truncated: false, empty: false })
    pageNode.selection = []
    expect(await call<ScopeInfo>(handlers(), MSG.scope, { scope: 'selection' })).toMatchObject({ name: 'Nothing selected', empty: true })
    expect(await call<ScopeInfo>(handlers(), MSG.scope, { scope: 'page' })).toMatchObject({ name: 'Checkout', frames: 1 })
  })

  it('runs the Accessibility agent over the real layers, streaming progress', async () => {
    const { pageNode } = page()
    installFigmaMock({ currentPage: pageNode as never, variables: { getLocalVariableCollectionsAsync: async () => [], getVariableByIdAsync: async () => null } as never })
    ctx.emit.mockClear()
    const result = await call<RunResult>(handlers(), MSG.run, { runId: 'r1', agent: 'accessibility', scope: 'selection', rules: [], brandModes: [], mode: 'suggest' })
    expect(result.scope.name).toBe('Card')
    expect(result.findings.map((f) => f.rule).sort()).toEqual(['1.4.3', '2.5.8'])
    expect(result.findings.find((f) => f.rule === '1.4.3')).toMatchObject({ nodeId: 'txt', severity: 'critical', fixable: false })
    expect(result.findings.find((f) => f.rule === '2.5.8')).toMatchObject({ nodeId: 'icon', fix: { kind: 'resize', width: 24, height: 24 } })
    expect(result.model).toBeNull()
    expect(result.steps[0]!.label).toBe('Loaded rule pack · WCAG 2.2 AA (all rules on)')
    expect(ctx.emit).toHaveBeenCalledWith(MSG.progress, expect.objectContaining({ runId: 'r1', percent: 100 }))
  })

  it('runs the Design system agent and names the off-scale gap', async () => {
    const { pageNode } = page()
    installFigmaMock({ currentPage: pageNode as never, variables: { getLocalVariableCollectionsAsync: async () => [], getVariableByIdAsync: async () => null } as never })
    const result = await call<RunResult>(handlers(), MSG.run, { runId: 'r2', agent: 'design-system', scope: 'page', rules: ['off-scale', 'raw-colour'], brandModes: [], mode: 'suggest' })
    expect(result.findings.map((f) => f.title)).toEqual(expect.arrayContaining(['Card gap 13 is off the 4px scale', 'Fill #FFFFFF has no variable']))
  })

  it('asks the configured model for Spelling and reads its findings back onto the layers', async () => {
    const { pageNode } = page()
    installFigmaMock({ currentPage: pageNode as never })
    const bodies: string[] = []
    const fetch: AiFetch = async (_url, init) => {
      bodies.push(init.body)
      return { status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: '{"findings":[{"index":0,"rule":"spelling","severity":"moderate","issue":"Typo","suggestion":"Pay now."}]}' }] }) }
    }
    const result = await call<RunResult>(handlers({ ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'k' }, fetch), MSG.run, { runId: 'r3', agent: 'spelling', scope: 'selection', rules: [], brandModes: [], mode: 'suggest' })
    expect(result.model).toEqual({ provider: 'claude', model: 'claude-opus-5-5' })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({ nodeId: 'txt', fix: { kind: 'replace-text', text: 'Pay now.' }, fixable: true })
    expect(JSON.parse(bodies[0]!).system).toContain('copy editor')
    // Without a key the agent says so instead of failing.
    const none = await call<RunResult>(handlers(), MSG.run, { runId: 'r4', agent: 'spelling', scope: 'selection', rules: [], brandModes: [], mode: 'suggest' })
    expect(none.model).toEqual({ skipped: 'No AI key in Settings' })
    expect(none.findings).toEqual([])
  })

  it('reports a failed model request, so a run with no findings isn’t read as clean', async () => {
    const fetch: AiFetch = async () => { throw new Error('offline') }
    const result = await call<RunResult>(handlers({ ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'k' }, fetch), MSG.run, { runId: 'r9', agent: 'spelling', scope: 'page', rules: [], brandModes: [], mode: 'suggest' })
    expect(result.findings).toEqual([])
    expect(result.failure).toMatchObject({ kind: 'network', provider: 'claude' })
  })

  it('applies text and resize fixes, reporting what could not be applied', async () => {
    const { label, icon, pageNode } = page()
    const resized: number[][] = []
    Object.assign(icon, { resize: (w: number, h: number) => { resized.push([w, h]) } })
    const figma = installFigmaMock({ currentPage: pageNode as never, getNodeByIdAsync: vi.fn(async (id: string) => ({ txt: label, icon }[id] ?? null)) as never })
    Object.assign(figma, { loadFontAsync: vi.fn(async () => undefined) })
    const result = await call<ApplyResult>(handlers(), MSG.apply, { fixes: [
      { id: 'f1', nodeIds: ['txt'], fix: { kind: 'replace-text', text: 'Pay £42.00' } },
      { id: 'f2', nodeIds: ['icon'], fix: { kind: 'resize', width: 24, height: 24 } },
      { id: 'f3', nodeIds: ['gone'], fix: { kind: 'replace-text', text: 'x' } },
      { id: 'f4', nodeIds: ['txt'], fix: { kind: 'manual', note: 'think' } },
    ] })
    expect(label.characters).toBe('Pay £42.00')
    expect(resized).toEqual([[24, 24]])
    expect(result.applied).toEqual(['f1', 'f2'])
    expect(result.failed).toEqual([{ id: 'f3', reason: 'Layer no longer exists' }, { id: 'f4', reason: 'This fix needs a designer' }])
  })

  it('writes Dev Mode annotations, replacing older agent notes', async () => {
    const { label, pageNode } = page()
    Object.assign(label, { annotations: [{ label: 'UX AI · old' }, { label: 'keep me' }] })
    installFigmaMock({ currentPage: pageNode as never, getNodeByIdAsync: vi.fn(async () => label) as never })
    expect(await call(handlers(), MSG.annotate, { findings: [{ nodeIds: ['txt'], label: 'WCAG 1.4.3 — low contrast' }] })).toEqual({ annotated: 1 })
    expect((label as unknown as { annotations: { label: string }[] }).annotations.map((a) => a.label)).toEqual(['keep me', 'UX AI · WCAG 1.4.3 — low contrast'])
  })

  it('talks about the run through the configured model and says when none is set up', async () => {
    const bodies: string[] = []
    const fetch: AiFetch = async (_u, init) => { bodies.push(init.body); return { status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: 'Applying now. [apply-safe]' }] }) } }
    const reply = await call<ChatResult>(handlers({ ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'k' }, fetch), MSG.chat, { agent: 'accessibility', messages: [{ role: 'user', content: 'fix them' }], context: 'Scope: Card' })
    expect(reply).toEqual({ status: 'answered', text: 'Applying now. [apply-safe]', provider: 'claude', model: 'claude-opus-5-5' })
    expect(JSON.parse(bodies[0]!).messages[0].content).toContain('Run context:\nScope: Card')
    expect(await call<ChatResult>(handlers(), MSG.chat, { agent: 'accessibility', messages: [{ role: 'user', content: 'hi' }], context: '' })).toEqual({ status: 'not-configured', reason: 'no-key' })
  })

  it('selects the layer a finding points at and says when it is gone', async () => {
    const node = { id: '1:2', type: 'FRAME' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as never })
    await call(handlers(), MSG.focus, { nodeId: '1:2' })
    expect(figma.currentPage.selection).toEqual([node])
    installFigmaMock()
    await expect(call(handlers(), MSG.focus, { nodeId: 'fixture:a1' })).rejects.toThrow('Layer no longer exists')
  })
})
