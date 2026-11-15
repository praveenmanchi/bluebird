import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_INTEGRATIONS, INTEGRATIONS_KEY } from '@shared/integrations'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers, mcpStatus, releases, targetStatus, track } from '../sandbox/handler'
import { findImpact, screenOf } from '../sandbox/impact'
import { DEFAULT_NAME, evaluate, usedComponents, type HandoffInventory } from '../sandbox/checks'
import { collectInventory, describeNode, pathOf } from '../sandbox/inspect'
import { MSG, type CheckResult, type McpStatus, type SelectionResult } from '../messages'
import type { GithubFetch } from '@shared/github/client'

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
    const set = tree({
      id: '40:1', type: 'COMPONENT_SET', name: 'Ticket Row', description: 'One issue row.', visible: true, parent: section,
      componentPropertyDefinitions: { State: { type: 'VARIANT', variantOptions: ['Default', 'Hover', 'Selected'] }, 'Title#1:2': { type: 'TEXT' }, 'Show assignee#1:3': { type: 'BOOLEAN' } },
    }, [
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
      selected: { nodeId: '40:1', frame: 'Ticket Row', path: 'Plugin UI › Components · 3 variants', type: 'COMPONENT_SET', variants: 3, layers: 5, description: 'One issue row.',
        variantAxes: [{ name: 'State', options: ['Default', 'Hover', 'Selected'] }], properties: ['Title', 'Show assignee'],
      },
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
    expect(await describeNode(instance as unknown as SceneNode)).toEqual({ nodeId: '8:1', frame: 'Button', path: 'Plugin UI · 2 variants', type: 'INSTANCE', variants: 2, layers: 1, description: 'Press it.', variantAxes: [], properties: [] })
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

  it('lists the components it is built from, most used first, and marks the local ones', () => {
    const inv = { ...clean, instanceList: [{ name: 'Avatar', remote: true }, { name: 'Button', remote: true }, { name: 'Button', remote: false }, { name: 'Banner', remote: false }] }
    expect(usedComponents(inv)).toEqual([
      { name: 'Button', count: 2, library: false },
      { name: 'Avatar', count: 1, library: true },
      { name: 'Banner', count: 1, library: false },
    ])
    expect(evaluate(inv).components).toHaveLength(3)
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
  const mcp = { ...DEFAULT_INTEGRATIONS.mcp, componentRepo: 'acme/design-system', componentToken: 'ghp_x', screenRepo: 'acme/web', screenToken: 'ghp_y', screenBranch: 'develop', screenPackage: '@acme/ui' }

  it('reports each scenario’s repository from Settings › MCP + code sync, never a token', async () => {
    installFigmaMock({ clientStorage: { getAsync: vi.fn(async (key: string) => key === INTEGRATIONS_KEY ? { mcp } : undefined) } } as unknown as Partial<PluginAPI>)
    const status = await call<McpStatus>(MSG.status)
    expect(status.targets.component).toEqual({ connected: true, repo: 'acme/design-system', branch: 'main', framework: 'React + TypeScript', folder: 'src/components', designPackage: '', pullRequests: '' })
    expect(status.targets.screen).toMatchObject({ connected: true, repo: 'acme/web', branch: 'develop', designPackage: '@acme/ui' })
    expect(status.targets.library).toMatchObject({ connected: false, problem: 'Add the repository and personal access token for Library update to screens in Settings › MCP + code sync' })
    expect(JSON.stringify(status)).not.toContain('ghp_')
  })

  it('names what is missing or wrong, one scenario at a time', () => {
    expect(targetStatus({ ...mcp, componentToken: '' }, 'component')).toMatchObject({ connected: false, repo: 'acme/design-system', problem: 'Add the personal access token for Component to Storybook in Settings › MCP + code sync' })
    expect(targetStatus({ ...mcp, componentToken: '' }, 'screen')).toMatchObject({ connected: true })
    expect(targetStatus({ ...mcp, enabled: false }, 'screen')).toMatchObject({ connected: false, problem: 'Turn on MCP + code sync in Settings' })
    expect(targetStatus({ ...mcp, screenRepo: 'acme' }, 'screen')).toMatchObject({ connected: false, problem: 'Fix the Screen to code fields in Settings › MCP + code sync' })
    expect(Object.keys(mcpStatus(mcp).targets)).toEqual(['component', 'screen', 'library'])
  })
})

describe('mcp:track', () => {
  const mcp = { ...DEFAULT_INTEGRATIONS.mcp, componentRepo: 'acme/design-system', componentToken: 'ghp_component', screenRepo: 'acme/web', screenToken: 'ghp_screen' }
  const github = (body: unknown, status = 200) => vi.fn<GithubFetch>(async () => ({ status, text: async () => JSON.stringify(body) }))
  const deps = (fetch: GithubFetch, settings = mcp) => ({ readMcp: async () => settings, fetch })

  it('asks the scenario’s repository for the branch, with that scenario’s token', async () => {
    const fetch = github([])
    expect(await track({ scenario: 'screen', branch: 'feat/BB-1-checkout' }, deps(fetch))).toEqual({ state: 'waiting', repo: 'acme/web', branch: 'feat/BB-1-checkout' })
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('https://api.github.com/repos/acme/web/pulls?head=acme%3Afeat%2FBB-1-checkout&state=all&per_page=1')
    expect(init.headers.Authorization).toBe('Bearer ghp_screen')
  })

  it('reports an open, merged or closed pull request', async () => {
    const pull = { number: 63, html_url: 'https://github.com/acme/design-system/pull/63', title: 'feat: add Ticket Row', state: 'open', merged_at: null }
    expect(await track({ scenario: 'component', branch: 'feat/ticket-row' }, deps(github([pull])))).toEqual({ state: 'open', repo: 'acme/design-system', branch: 'feat/ticket-row', number: 63, url: pull.html_url, title: pull.title })
    expect(await track({ scenario: 'component', branch: 'feat/ticket-row' }, deps(github([{ ...pull, state: 'closed', merged_at: '2026-11-15T14:06:00Z' }])))).toMatchObject({ state: 'merged' })
    expect(await track({ scenario: 'component', branch: 'feat/ticket-row' }, deps(github([{ ...pull, state: 'closed' }])))).toMatchObject({ state: 'closed' })
  })

  it('uses the GitHub Enterprise host when one is set', async () => {
    const fetch = github([])
    await track({ scenario: 'component', branch: 'feat/x' }, deps(fetch, { ...mcp, enterpriseUrl: 'https://github.acme.com/' }))
    expect(fetch.mock.calls[0]![0]).toContain('https://github.acme.com/api/v3/repos/acme/design-system/pulls')
  })

  it('refuses a scenario without a repository, a bad branch name, and reports a rejected token', async () => {
    const fetch = github([])
    await expect(track({ scenario: 'library', branch: 'feat/x' }, deps(fetch))).rejects.toThrow('Library update to screens in Settings › MCP + code sync')
    await expect(track({ scenario: 'screen', branch: 'feat/x' }, deps(fetch, { ...mcp, screenToken: '' }))).rejects.toThrow('Add the personal access token for Screen to code in Settings › MCP + code sync')
    await expect(track({ scenario: 'component', branch: 'feat x' }, deps(fetch))).rejects.toThrow()
    await expect(track({ scenario: 'component', branch: '../etc' }, deps(fetch))).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
    await expect(track({ scenario: 'component', branch: 'feat/x' }, deps(github({ message: 'Bad credentials' }, 401)))).rejects.toThrow('GitHub rejected the token for Component to Storybook. Paste a new one in Settings › MCP + code sync.')
    await expect(track({ scenario: 'component', branch: 'feat/x' }, deps(github({ message: 'Not Found' }, 404)))).rejects.toThrow('GitHub can’t find acme/design-system. Check the Component to Storybook repository in Settings › MCP + code sync')
  })
})

describe('mcp:track — one pull request per screen', () => {
  const mcp = { ...DEFAULT_INTEGRATIONS.mcp, libraryRepo: 'acme/web', libraryToken: 'ghp_library', libraryBranch: 'develop' }
  it('asks for the newest pull requests into the base branch once, and matches each screen branch', async () => {
    const pulls = [
      { number: 91, html_url: 'https://github.com/acme/web/pull/91', title: 'from a fork', state: 'open', merged_at: null, head: { ref: 'chore/x/checkout', repo: { full_name: 'someone/web' } } },
      { number: 90, html_url: 'https://github.com/acme/web/pull/90', title: 'chore: cart', state: 'open', merged_at: null, head: { ref: 'chore/x/cart', repo: { full_name: 'acme/web' } } },
      { number: 89, html_url: 'https://github.com/acme/web/pull/89', title: 'other', state: 'open', merged_at: null, head: { ref: 'feat/other', repo: { full_name: 'acme/web' } } },
    ]
    const fetch = vi.fn<GithubFetch>(async () => ({ status: 200, text: async () => JSON.stringify(pulls) }))
    const result = await track({ scenario: 'library', branch: 'chore/x', branches: ['chore/x/checkout', 'chore/x/cart'] }, { readMcp: async () => mcp, fetch })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toBe('https://api.github.com/repos/acme/web/pulls?base=develop&state=all&sort=created&direction=desc&per_page=100')
    expect(fetch.mock.calls[0]![1].headers.Authorization).toBe('Bearer ghp_library')
    expect(result).toEqual({
      state: 'waiting', repo: 'acme/web', branch: 'chore/x',
      pulls: [{ branch: 'chore/x/checkout', state: 'waiting' }, { branch: 'chore/x/cart', state: 'open', number: 90, url: pulls[1]!.html_url, title: 'chore: cart' }],
    })
  })

  it('asks for an unmatched branch on its own when the newest page is full', async () => {
    const page = Array.from({ length: 100 }, (_, i) => ({ number: 200 + i, html_url: 'https://github.com/acme/web/pull/1', title: 't', state: 'open', merged_at: null, head: { ref: `feat/n${i}`, repo: { full_name: 'acme/web' } } }))
    const old = [{ number: 12, html_url: 'https://github.com/acme/web/pull/12', title: 'chore: checkout', state: 'closed', merged_at: '2026-11-01T00:00:00Z' }]
    const fetch = vi.fn<GithubFetch>(async (url) => ({ status: 200, text: async () => JSON.stringify(url.includes('head=') ? old : page) }))
    const result = await track({ scenario: 'library', branch: 'chore/x', branches: ['chore/x/checkout'] }, { readMcp: async () => mcp, fetch })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ state: 'merged', pulls: [{ branch: 'chore/x/checkout', state: 'merged', number: 12 }] })
  })

  it('refuses more branches than it tracks', async () => {
    const fetch = vi.fn<GithubFetch>()
    const branches = Array.from({ length: 21 }, (_, i) => `chore/x/s${i}`)
    await expect(track({ scenario: 'library', branch: 'chore/x', branches }, { readMcp: async () => mcp, fetch })).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('mcp:releases', () => {
  const now = () => new Date('2026-11-15T12:00:00.000Z')
  const github = { ...DEFAULT_INTEGRATIONS.github, repo: 'acme/history', apiKey: 'ghp_h' }
  const storage = DEFAULT_INTEGRATIONS.storage

  it('says where to set up the team History when Storage has no repository', async () => {
    const fetch = vi.fn<GithubFetch>()
    const result = await releases({ readGithub: async () => DEFAULT_INTEGRATIONS.github, readStorage: async () => storage, fetch, now })
    expect(result.releases).toEqual([])
    expect(result.problem).toContain('Library releases come from the team History.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reads the History folder and keeps the finished library changes', async () => {
    const entry = {
      schema: 1, id: 'cl1bridge2', type: 'changelog', status: 'done', title: 'Bridge DS 2.0', summary: '', at: '2026-11-14T10:20:00.000Z', by: { name: 'Anita' }, file: 'Bridge DS',
      details: { sections: [{ kind: 'changes', title: 'Component changes', unit: 'component', groups: [{ change: 'modified', rows: [{ name: 'Button', valueKind: 'text', note: 'x' }] }] }] },
    }
    const fetch = vi.fn<GithubFetch>(async (url) => {
      if (url.includes('/contents/.bluebird/history?')) return { status: 200, text: async () => JSON.stringify([{ name: '2026-11-14.json', type: 'file', sha: 's1' }]) }
      return { status: 200, text: async () => JSON.stringify({ schema: 1, entries: [entry, { ...entry, id: 'cl2review0', status: 'review' }] }) } // the day file, read raw
    })
    const result = await releases({ readGithub: async () => github, readStorage: async () => storage, fetch, now })
    expect(result.problem).toBeUndefined()
    expect(result.releases.map((r) => [r.id, r.components.map((c) => c.name)])).toEqual([['cl1bridge2', ['Button']]])
  })
})

describe('mcp:impact (findImpact)', () => {
  /** A page with a section holding a screen, a loose screen, and an instance nested in another instance. */
  function file() {
    const button = { name: 'Size=Large', parent: { type: 'COMPONENT_SET', name: 'Button' } }
    const toggle = { name: 'Toggle', parent: { type: 'PAGE' } }
    const instance = (id: string, main: unknown) => ({ id, type: 'INSTANCE', name: 'x', getMainComponentAsync: async () => main })
    const pageA = tree({ type: 'PAGE', name: '  ↳ Web', loadAsync: async () => undefined } as Record<string, unknown>)
    const section = tree({ id: 's:1', type: 'SECTION', name: 'Flow', parent: pageA })
    const checkout = tree({ id: '1:1', type: 'FRAME', name: 'Checkout', parent: section }, [instance('1:2', button), instance('1:3', button), instance('1:4', toggle)])
    const outer = tree({ id: '1:9', type: 'INSTANCE', name: 'Card', getMainComponentAsync: async () => ({ name: 'Card', parent: { type: 'PAGE' } }) }, [instance('1:10', button)])
    const cart = tree({ id: '2:1', type: 'FRAME', name: 'Cart', parent: pageA }, [instance('2:2', button), outer])
    section.children.push(checkout)
    pageA.children.push(section, cart)
    const all = [...checkout.children, ...cart.children, ...outer.children]
    ;(pageA as unknown as { findAllWithCriteria: () => unknown[] }).findAllWithCriteria = () => all
    return pageA
  }

  it('groups instances of the changed components by screen, skipping instances inside other instances', async () => {
    const page = file()
    installFigmaMock({ root: { children: [page] } as unknown as DocumentNode })
    const result = await findImpact(['Button', 'toggle'])
    expect(result).toEqual({
      screens: [
        { nodeId: '1:1', name: 'Checkout', page: 'Web', uses: [{ name: 'Button', count: 2 }, { name: 'Toggle', count: 1 }] },
        { nodeId: '2:1', name: 'Cart', page: 'Web', uses: [{ name: 'Button', count: 1 }] },
      ],
      pages: 1, scanned: 5, truncated: false, // the instance nested in Card is skipped before counting
    })
  })

  it('finds the screen of a node: the first layer under the page, looking through sections', () => {
    const page = file()
    const section = page.children[0] as { children: Array<{ children: unknown[] }> }
    expect((screenOf(section.children[0]!.children[0] as BaseNode) as { name: string }).name).toBe('Checkout')
    expect(screenOf(section as unknown as BaseNode)).toBeNull()
    const outer = tree({ id: 's:2', type: 'SECTION', name: 'Outer', parent: page })
    const inner = tree({ id: 's:3', type: 'SECTION', name: 'Inner', parent: outer })
    const group = tree({ id: 'g:1', type: 'GROUP', name: 'Profile', parent: inner }, [{ id: 'g:2', type: 'INSTANCE', name: 'Avatar' }])
    expect((screenOf(group.children[0] as BaseNode) as { name: string }).name).toBe('Profile')
  })

  it('does not count a component dropped straight on the page as a screen', async () => {
    const page = tree({ type: 'PAGE', name: 'Samples', loadAsync: async () => undefined } as Record<string, unknown>)
    const loose = { id: '5:1', type: 'INSTANCE', name: 'Button', parent: page, getMainComponentAsync: async () => ({ name: 'Button', parent: { type: 'PAGE' } }) }
    page.children.push(loose)
    ;(page as unknown as { findAllWithCriteria: () => unknown[] }).findAllWithCriteria = () => [loose]
    installFigmaMock({ root: { children: [page] } as unknown as DocumentNode })
    expect((await findImpact(['Button'])).screens).toEqual([])
  })

  it('rejects an empty list through the handler', async () => {
    installFigmaMock({ root: { children: [] } as unknown as DocumentNode })
    await expect(call(MSG.impact, { components: [] })).rejects.toThrow()
  })
})
