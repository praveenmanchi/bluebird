import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_INTEGRATIONS, INTEGRATIONS_KEY } from '@shared/integrations'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { githubStatus, handlers } from '../sandbox/handler'
import { DEFAULT_NAME, evaluate, type HandoffInventory } from '../sandbox/checks'
import { collectInventory, describeNode, pathOf } from '../sandbox/inspect'
import { MSG, type CheckResult, type McpStatus, type SelectionResult } from '../messages'

const call = <T = void>(type: string, payload?: unknown) => (handlers[type] as unknown as (p: unknown) => Promise<T> | T)(payload)

/** A minimal scene graph: parents link back so pathOf can climb. */
function tree<T extends Record<string, unknown>>(node: T, children: Record<string, unknown>[] = []): T & { children: unknown[] } {
  const out = { ...node, children } as T & { children: unknown[] }
  for (const c of children) (c as { parent: unknown }).parent = out
  return out
}

const page = { type: 'PAGE', name: 'Plugin UI', parent: { type: 'DOCUMENT', name: 'Doc', parent: null } }
const solid = (hex: [number, number, number]) => ({ type: 'SOLID', color: { r: hex[0], g: hex[1], b: hex[2] }, opacity: 1, visible: true })

describe('mcp:focus', () => {
  it('selects the frame and scrolls it into view', async () => {
    const node = { id: '1:2', type: 'FRAME' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as unknown as PluginAPI['getNodeByIdAsync'] })
    await call(MSG.focus, { nodeId: '1:2' })
    expect(figma.currentPage.selection).toEqual([node])
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('rejects a missing frame and an invalid payload', async () => {
    installFigmaMock()
    await expect(call(MSG.focus, { nodeId: '9:9' })).rejects.toThrow('no longer exists')
    await expect(call(MSG.focus, { nodeId: '' })).rejects.toThrow()
  })
})

describe('mcp:open', () => {
  it('opens an https link in the browser', () => {
    const openExternal = vi.fn()
    installFigmaMock({ openExternal } as unknown as Partial<PluginAPI>)
    call(MSG.open, { url: 'https://github.com/praveenmanchi/bluebird/pull/63' })
    expect(openExternal).toHaveBeenCalledWith('https://github.com/praveenmanchi/bluebird/pull/63')
  })

  it('refuses anything that is not an https link', () => {
    const openExternal = vi.fn()
    installFigmaMock({ openExternal } as unknown as Partial<PluginAPI>)
    for (const url of ['javascript:alert(1)', 'http://github.com/x', 'data:text/html,hi', 'https://']) {
      expect(() => call(MSG.open, { url })).toThrow()
    }
    expect(openExternal).not.toHaveBeenCalled()
  })
})

describe('mcp:selection', () => {
  it('describes the first selected layer with its path, variants and layer count', async () => {
    const section = tree({ type: 'SECTION', name: 'Components', parent: page })
    const set = tree({ id: '40:1', type: 'COMPONENT_SET', name: 'Ticket Row', description: 'One issue row.', visible: true, parent: section }, [
      tree({ id: '40:2', type: 'COMPONENT', name: 'State=Default', visible: true }, [{ id: '40:5', type: 'TEXT', name: 'Title', visible: true }]),
      tree({ id: '40:3', type: 'COMPONENT', name: 'State=Hover', visible: true }),
      tree({ id: '40:4', type: 'COMPONENT', name: 'State=Selected', visible: true }),
    ])
    section.children.push(set)
    const figma = installFigmaMock()
    ;(figma.currentPage as unknown as { selection: unknown[] }).selection = [set, section]
    ;(figma.root as { name: string }).name = 'Bluebird · Plugin UI'
    const result = await call<SelectionResult>(MSG.selection)
    expect(result).toEqual({
      selected: { nodeId: '40:1', frame: 'Ticket Row', path: 'Plugin UI › Components · 3 variants', type: 'COMPONENT_SET', variants: 3, layers: 5, description: 'One issue row.' },
      count: 2,
      fileName: 'Bluebird · Plugin UI',
      fileKey: null,
    })
    expect(pathOf(set.children[0] as BaseNode)).toBe('Plugin UI › Components › Ticket Row')
  })

  it('reports nothing selected, and an instance through its main component', async () => {
    installFigmaMock()
    expect(await call<SelectionResult>(MSG.selection)).toMatchObject({ selected: null, count: 0 })
    const main = tree({ id: '7:1', type: 'COMPONENT', name: 'Button', description: 'Press it.', parent: tree({ type: 'COMPONENT_SET', name: 'Button set', parent: page }, [{}, {}]) })
    const instance = tree({ id: '8:1', type: 'INSTANCE', name: 'Button', visible: true, parent: page, getMainComponentAsync: async () => main })
    expect(await describeNode(instance as unknown as SceneNode)).toEqual({ nodeId: '8:1', frame: 'Button', path: 'Plugin UI · 2 variants', type: 'INSTANCE', variants: 2, layers: 1, description: 'Press it.' })
  })
})

describe('readiness checks', () => {
  const clean: HandoffInventory = {
    nodeId: '1:1', name: 'Card', type: 'COMPONENT', description: 'A card.', layers: 12,
    instanceList: [{ name: 'Button', remote: true }, { name: 'Avatar', remote: true }], detached: [],
    frames: 3, autoLayout: 3, absolute: [], boundPaints: 6, rawPaints: [], boundNumbers: 4, rawNumbers: [], texts: 2, unstyledTexts: [], defaultNames: [],
  }

  it('passes a clean component at 100', () => {
    const r = evaluate(clean)
    expect(r.readiness).toEqual({ tone: 'success', value: 100 })
    expect(r.checks.map((c) => [c.id, c.status])).toEqual([['components', 'pass'], ['variables', 'pass'], ['auto-layout', 'pass'], ['text', 'pass'], ['naming', 'pass'], ['description', 'pass']])
    expect(r.checks[0]!.detail).toBe('2 of 2 instances come from the library')
    expect(r.stats).toMatchObject({ layers: 12, instances: 2, libraryInstances: 2, boundPaints: 6, rawPaints: 0, styledTexts: 2 })
  })

  it('fails on detached instances and mostly raw values, warns on the rest', () => {
    const r = evaluate({
      ...clean, type: 'FRAME', description: '',
      instanceList: [{ name: 'Button', remote: true }, { name: 'Chip', remote: false }], detached: ['Dropdown', 'Button'],
      absolute: ['Header'], boundPaints: 1, rawPaints: ['#0C8CE9', '#FFFFFF', '#0C8CE9', '#242424'], boundNumbers: 0, rawNumbers: [6, 10],
      unstyledTexts: ['Title'], defaultNames: ['Frame 12', 'Rectangle 3', 'Group 7', 'Frame 13'],
    })
    const byId = Object.fromEntries(r.checks.map((c) => [c.id, c]))
    expect(byId.components).toMatchObject({ status: 'fail', detail: '2 detached instances: Dropdown, Button', actionLabel: 'Reattach' })
    expect(byId.variables).toMatchObject({ status: 'fail', detail: 'Only 14% bound to variables · 4 raw colours (#0C8CE9, #FFFFFF, #242424) · 2 unbound gaps (6px, 10px)', actionLabel: 'Fix all' })
    expect(byId['auto-layout']).toMatchObject({ status: 'warning', detail: '1 of 3 frames use absolute positioning: Header' })
    expect(byId.text).toMatchObject({ status: 'warning', detail: '1 of 2 text layers have no text style: Title' })
    expect(byId.naming).toMatchObject({ status: 'warning', detail: '4 layers keep Figma’s default name: Frame 12, Rectangle 3, Group 7 +1' })
    expect(byId.description).toBeUndefined() // a frame has no description to give
    expect(r.readiness).toEqual({ tone: 'danger', value: 100 - 2 * 25 - 3 * 8 })
  })

  it('warns at 80%+ bound, on local components and a missing description', () => {
    const r = evaluate({ ...clean, description: '', instanceList: [{ name: 'Chip', remote: false }], boundPaints: 8, rawPaints: ['#FFFFFF'], rawNumbers: [6] })
    const byId = Object.fromEntries(r.checks.map((c) => [c.id, c]))
    expect(byId.components).toMatchObject({ status: 'warning', detail: '1 of 1 instances come from local components, not the library: Chip', actionLabel: 'Publish' })
    expect(byId.variables).toMatchObject({ status: 'warning', detail: '86% bound to variables · 1 raw colour (#FFFFFF) · 1 unbound gap (6px)', actionLabel: 'Fix' })
    expect(byId.description).toMatchObject({ status: 'warning', actionLabel: 'Describe' })
    expect(r.readiness).toEqual({ tone: 'warning', value: 76 })
    expect(evaluate({ ...clean, instanceList: [] }).checks[0]).toMatchObject({ status: 'warning', detail: 'No library components — the generated code starts from primitives' })
  })

  it('recognises Figma’s default layer names', () => {
    for (const name of ['Frame 12', 'Rectangle 3', 'Group', 'Vector 44', 'Ellipse 1', 'Text', 'Union']) expect(DEFAULT_NAME.test(name)).toBe(true)
    for (const name of ['Frame header', 'Button / Primary', 'Rectangle-bg', 'label']) expect(DEFAULT_NAME.test(name)).toBe(false)
  })
})

describe('mcp:check (collectInventory)', () => {
  it('reads instances, bindings, auto layout and text styles from the selection', async () => {
    const remote = { name: 'Button', remote: true, parent: { type: 'COMPONENT_SET', name: 'Buttons' } }
    const root = tree({
      id: '1:1', type: 'COMPONENT', name: 'Card', description: '', visible: true, parent: page,
      layoutMode: 'VERTICAL', itemSpacing: 8, paddingLeft: 12, paddingRight: 12, paddingTop: 0, paddingBottom: 0, cornerRadius: 8,
      fills: [solid([1, 1, 1])], strokes: [solid([0, 0, 0])],
      boundVariables: { fills: [{ id: 'V:1' }], itemSpacing: { id: 'V:2' }, paddingLeft: { id: 'V:3' }, topLeftRadius: { id: 'V:4' } },
    }, [
      tree({ id: '1:2', type: 'FRAME', name: 'Frame 12', visible: true, layoutMode: 'NONE', fills: [], detachedInfo: { type: 'local' } }, [{ id: '1:9', type: 'TEXT', name: 'Styled', visible: true, textStyleId: 'S:1', fills: [] }, { id: '1:10', type: 'RECTANGLE', name: 'Rectangle 2', visible: true, fills: [solid([0, 0.2, 0.5])] }]),
      tree({ id: '1:3', type: 'INSTANCE', name: 'Button', visible: true, layoutMode: 'HORIZONTAL', itemSpacing: 4, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, fills: [], getMainComponentAsync: async () => remote }, [{ id: '1:11', type: 'TEXT', name: 'Inside instance', visible: true, textStyleId: '' }]),
      { id: '1:4', type: 'TEXT', name: 'Title', visible: true, textStyleId: '', fills: [solid([0, 0, 0])], boundVariables: {} },
      { id: '1:5', type: 'TEXT', name: 'Hidden', visible: false, textStyleId: '' },
    ])
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async (id: string) => id === '1:1' ? root : null) as unknown as PluginAPI['getNodeByIdAsync'] })
    const inv = await collectInventory(root as unknown as SceneNode)
    expect(inv).toMatchObject({
      nodeId: '1:1', type: 'COMPONENT', layers: 7, // hidden layers are walked but not counted against the design; instance insides are skipped
      instanceList: [{ name: 'Buttons', remote: true }], detached: ['Frame 12'],
      frames: 3, autoLayout: 2, absolute: ['Frame 12'],
      boundPaints: 1, rawPaints: ['#000000', '#003380', '#000000'], boundNumbers: 3, rawNumbers: [12, 4],
      texts: 2, unstyledTexts: ['Title'], defaultNames: ['Frame 12', 'Rectangle 2'],
    })
    const result = await call<CheckResult>(MSG.check, { nodeId: '1:1' })
    expect(result.checks.find((c) => c.id === 'components')).toMatchObject({ status: 'fail', detail: '1 detached instance: Frame 12' })
    expect(result.readiness.tone).toBe('danger')
    expect(figma.getNodeByIdAsync).toHaveBeenCalledWith('1:1')
    await expect(call(MSG.check, { nodeId: 'gone' })).rejects.toThrow('Select it again')
  })
})

describe('mcp:status', () => {
  const mcp = { ...DEFAULT_INTEGRATIONS.mcp, repo: 'acme/web', token: 'ghp_x', baseBranch: 'develop' }

  it('reports Settings › MCP + code sync', async () => {
    installFigmaMock({ clientStorage: { getAsync: vi.fn(async (key: string) => key === INTEGRATIONS_KEY ? { mcp } : undefined) } } as unknown as Partial<PluginAPI>)
    expect(await call<McpStatus>(MSG.status)).toEqual({ github: { connected: true, repo: 'acme/web', branch: 'develop' } })
  })

  it('names what is missing or wrong', () => {
    expect(githubStatus(DEFAULT_INTEGRATIONS.mcp)).toMatchObject({ connected: false, problem: 'Add the repository and personal access token in Settings › MCP + code sync' })
    expect(githubStatus({ ...mcp, token: '' })).toMatchObject({ connected: false, repo: 'acme/web', problem: 'Add the personal access token in Settings › MCP + code sync' })
    expect(githubStatus({ ...mcp, enabled: false })).toMatchObject({ connected: false, problem: 'Turn on MCP + code sync in Settings' })
    expect(githubStatus({ ...mcp, repo: 'acme' })).toMatchObject({ connected: false, problem: 'Fix the repo in Settings › MCP + code sync' })
  })
})
