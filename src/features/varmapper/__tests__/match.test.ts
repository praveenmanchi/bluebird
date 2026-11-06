import { describe, it, expect } from 'vitest'
import type { LibraryVariable } from '@shared/libraries'
import { groupFindings, recommend } from '../match'
import type { Finding, MatchContext, Neighbourhood, ValueScope } from '../messages'

type Modes = Record<string, string>

const variable = (name: string, value: string | Modes, scopes: string[], o: Partial<LibraryVariable> & { alias?: boolean } = {}): LibraryVariable => {
  const { alias, ...rest } = o
  const aliased = alias === false ? {} : { aliasOf: 'primitive' }
  const values = typeof value === 'string' ? [{ mode: 'Value', value, ...aliased }] : Object.entries(value).map(([mode, v]) => ({ mode, value: v, ...aliased }))
  const first = values[0]!.value
  return { id: `id:${name}`, key: `key:${name}`, name, collection: values.length > 1 ? 'Brand UI' : 'Semantics', type: first.startsWith('#') ? 'COLOR' : 'FLOAT', description: '', scopes, values, fileKey: 'lib', ...rest }
}

const SCOPES = { fill: ['ALL_FILLS', 'STROKE_COLOR'], text: ['TEXT_FILL'], radius: ['CORNER_RADIUS'], gap: ['GAP'], font: ['FONT_SIZE'] }
const POOL: LibraryVariable[] = [
  variable('text/secondary', '#F7F7F7', SCOPES.text),
  variable('surface/raised', '#333333', SCOPES.fill),
  variable('surface/transparent', '#FFFFFF00', SCOPES.fill),
  variable('akzonobel/color/neutral/50', '#FAFAFA', SCOPES.fill, { alias: false, collection: 'Foundations' }),
  variable('brand/page', { Bridge: '#101010', AkzoNobel: '#F0F0F0' }, SCOPES.fill),
  variable('radius/sm', '2', SCOPES.radius),
  variable('radius/xl', '8', SCOPES.radius),
  variable('radius/pill', '100', SCOPES.radius),
  variable('space/inset-xl', '16', SCOPES.gap),
  variable('dimension/space/64', '64', SCOPES.gap, { alias: false, collection: 'Foundations' }),
  variable('font/size-title', '16', SCOPES.font),
]

const context = (o: Partial<MatchContext> = {}): MatchContext => ({ modes: {}, words: [], neighbours: [], ...o })
const best = (value: number | string, scope: ValueScope, o: { opacity?: number; context?: MatchContext } = {}, pool = POOL) => {
  const r = recommend({ value, scope, ...o }, pool)
  return { match: r.match, name: r.candidates[0]?.name }
}

describe('recommend: the gate', () => {
  it('only counts a value as exact in the layer’s active mode', () => {
    expect(best('#101010', 'FRAME_FILL', { context: context({ modes: { 'Brand UI': 'Bridge' } }) }).match).not.toBe('near')
    expect(best('#F0F0F0', 'FRAME_FILL', { context: context({ modes: { 'Brand UI': 'Bridge' } }) }).name).not.toBe('brand/page')
    expect(best('#F0F0F0', 'FRAME_FILL', { context: context({ modes: { 'Brand UI': 'AkzoNobel' } }) }).name).toBe('brand/page')
  })

  it('uses the first mode when the layer has none for that collection', () => {
    expect(best('#101010', 'FRAME_FILL').name).toBe('brand/page')
    expect(best('#F0F0F0', 'FRAME_FILL').name).not.toBe('brand/page')
  })

  it('doesn’t call a clearly different colour near', () => {
    const pool = [variable('toggle/track', '#0C8CE9', SCOPES.text)]
    expect(recommend({ value: '#60A5FA', scope: 'TEXT_FILL' }, pool).match).toBe('none')
  })

  it('won’t vouch for a variable that lacks the layer’s mode', () => {
    const r = recommend({ value: '#101010', scope: 'FRAME_FILL', context: context({ modes: { 'Brand UI': 'Renamed' } }) }, POOL)
    expect(r.candidates.map((c) => c.name)).not.toContain('brand/page')
  })

  it('still reads a single-mode variable whatever its mode is called', () => {
    expect(best(16, 'GAP', { context: context({ modes: { Semantics: 'Mode 1' } }) }).name).toBe('space/inset-xl')
  })

  it('needs an identical colour for exact: one step away is near', () => {
    expect(best('#333334', 'FRAME_FILL')).toEqual({ match: 'near', name: 'surface/raised' })
  })

  it('compares alpha, so a transparent white is not a white', () => {
    const names = recommend({ value: '#FFFFFF', scope: 'FRAME_FILL' }, POOL).candidates.map((c) => c.name)
    expect(names).not.toContain('surface/transparent')
  })

  it('matches a paint opacity against the variable’s alpha', () => {
    const pool = [variable('surface/overlay', '#383838C4', SCOPES.fill)]
    expect(recommend({ value: '#383838', opacity: 0.77, scope: 'FRAME_FILL' }, pool).candidates[0]?.exact).toBe(true)
    expect(recommend({ value: '#383838', scope: 'FRAME_FILL' }, pool).candidates.some((c) => c.exact)).toBe(false)
  })

  it('only offers variables scoped to the property', () => {
    expect(best(16, 'FONT_SIZE').name).toBe('font/size-title')
    expect(best(16, 'CORNER_RADIUS').name).not.toBe('space/inset-xl')
  })

  it('tells frame fills from shape fills', () => {
    const pool = [variable('frame/bg', '#111111', ['FRAME_FILL']), variable('shape/bg', '#111111', ['SHAPE_FILL'])]
    expect(best('#111111', 'SHAPE_FILL', {}, pool).name).toBe('shape/bg')
    expect(best('#111111', 'FRAME_FILL', {}, pool).name).toBe('frame/bg')
  })

  it('never offers a raw primitive colour when the source has semantic ones', () => {
    expect(best('#FAFAFA', 'TEXT_FILL')).toEqual({ match: 'near', name: 'text/secondary' })
  })

  it('never offers another brand’s colour, even an aliased one', () => {
    const pool = [variable('brand/page', { Bridge: '#101010', AkzoNobel: '#F0F0F0' }, SCOPES.fill), variable('akzonobel/color/surface', '#FAFAFA', SCOPES.fill, { collection: 'Foundations' })]
    expect(recommend({ value: '#FAFAFA', scope: 'FRAME_FILL' }, pool).candidates.map((c) => c.name)).not.toContain('akzonobel/color/surface')
  })

  it('keeps a raw colour that changes per mode', () => {
    const pool = [variable('surface/page', { Bridge: '#101010', Gap: '#FFFFFF' }, SCOPES.fill, { alias: false }), variable('text/one', '#222222', SCOPES.fill)]
    expect(best('#101010', 'FRAME_FILL', {}, pool).name).toBe('surface/page')
  })

  it('uses primitives when the source has nothing else', () => {
    const pool = [variable('blue/500', '#0000FF', SCOPES.fill, { alias: false })]
    expect(best('#0000FF', 'FRAME_FILL', {}, pool).name).toBe('blue/500')
  })
})

describe('recommend: near and no match', () => {
  it('calls a 1 px radius near the 2 px variable', () => {
    expect(best(1, 'CORNER_RADIUS')).toEqual({ match: 'near', name: 'radius/sm' })
  })

  it('treats a very large radius as near the pill variable', () => {
    expect(best(999, 'CORNER_RADIUS')).toEqual({ match: 'near', name: 'radius/pill' })
  })

  it('refuses a recommendation that would visibly change the design', () => {
    expect(best(24, 'CORNER_RADIUS').match).toBe('none')
    expect(best(80, 'GAP').match).toBe('none')
  })

  it('still lists the nearest variables for a value with no match', () => {
    expect(recommend({ value: 24, scope: 'CORNER_RADIUS' }, POOL).candidates.map((c) => c.name)).toEqual(['radius/xl', 'radius/sm', 'radius/pill'])
  })

  it('marks near candidates as changing the value', () => {
    expect(recommend({ value: 1, scope: 'CORNER_RADIUS' }, POOL).candidates.every((c) => !c.exact)).toBe(true)
  })

  it('has nothing to offer when the source holds no variable of that type', () => {
    expect(recommend({ value: 12, scope: 'LINE_HEIGHT' }, POOL)).toMatchObject({ match: 'none', candidates: [], matches: 0 })
  })
})

const neighbours = (names: readonly string[]): Neighbourhood => {
  const count = (cut: number) => names.reduce((m, n) => { const k = n.split('/').slice(0, cut).join('/'); return m.set(k, (m.get(k) ?? 0) + 1) }, new Map<string, number>())
  return { total: names.length, first: count(1), firstTwo: count(2), uses: new Map() }
}

describe('recommend: ranking and confidence', () => {
  const twins = [variable('a11y/space/panel', '16', SCOPES.gap), variable('jira/space/panel', '16', SCOPES.gap), variable('dimension/space/16', '16', SCOPES.gap)]

  it('asks a designer to check when nothing separates the candidates', () => {
    expect(recommend({ value: 16, scope: 'GAP' }, twins).match).toBe('check')
  })

  it('counts every variable with the value', () => {
    expect(recommend({ value: 16, scope: 'GAP' }, twins).matches).toBe(3)
  })

  it('uses words from the layer and its parents', () => {
    expect(best(16, 'GAP', { context: context({ words: ['jira', 'board', 'panel'] }) }, twins).name).toBe('jira/space/panel')
  })

  it('follows what neighbouring layers use', () => {
    const r = recommend({ value: 16, scope: 'GAP', context: context({ neighbours: [neighbours(['jira/space/row', 'jira/space/card', 'jira/radius/card'])] }) }, twins)
    expect(r.candidates[0]?.name).toBe('jira/space/panel')
    expect(r.match).toBe('exact')
  })

  it('skips a neighbourhood with too few bindings to mean anything', () => {
    const near = neighbours(['a11y/space/row'])
    const wider = neighbours(['jira/space/row', 'jira/space/card', 'jira/radius/card'])
    expect(best(16, 'GAP', { context: context({ neighbours: [near, wider] }) }, twins).name).toBe('jira/space/panel')
  })

  it('counts the same variable in the same role nearby', () => {
    const n = { ...neighbours(['x/y', 'x/z', 'x/w']), uses: new Map([['key:dimension/space/16|padding', 3]]) }
    expect(recommend({ value: 16, scope: 'GAP', role: 'padding', context: context({ neighbours: [n] }) }, twins).candidates[0]?.name).toBe('dimension/space/16')
  })

  it('demotes a state variable the layer doesn’t carry', () => {
    const pool = [variable('button/bg/hover', '#111111', SCOPES.fill), variable('button/bg/default', '#111111', SCOPES.fill)]
    expect(best('#111111', 'FRAME_FILL', {}, pool).name).toBe('button/bg/default')
    expect(best('#111111', 'FRAME_FILL', { context: context({ words: ['button', 'hover'] }) }, pool).name).toBe('button/bg/hover')
  })

  it('doesn’t trust a lone candidate whose name has nothing to do with the role', () => {
    const pool = [variable('misc/thing', '16', SCOPES.gap)]
    expect(recommend({ value: 16, scope: 'GAP' }, pool).match).toBe('check')
  })

  it('trusts a lone candidate whose name fits the role', () => {
    expect(recommend({ value: 16, scope: 'GAP', role: 'gap' }, [variable('dimension/space/16', '16', SCOPES.gap)]).match).toBe('exact')
  })
})

const finding = (nodeId: string, name: string, value: number | string, o: Partial<Finding> = {}): Finding => ({
  category: 'spacing', property: 'Padding', value, scope: 'GAP',
  target: { nodeId, field: 'paddingLeft' }, layer: { id: nodeId, name, path: 'Page header' }, ...o,
})
const fill = (nodeId: string, value: string, o: Partial<Finding> = {}) => finding(nodeId, 'A', value, { category: 'colors', property: 'Fill', scope: 'FRAME_FILL', target: { nodeId, field: 'fills', paintIndex: 0 }, ...o })

describe('groupFindings', () => {
  it('groups by property and value, counting each layer once', () => {
    const groups = groupFindings([
      finding('1', 'Frame', 16),
      finding('1', 'Frame', 16, { target: { nodeId: '1', field: 'paddingRight' } }),
      finding('2', 'Card', 16),
      finding('3', 'Chip', 12),
    ], POOL)
    expect(groups.map((g) => [g.current, g.layers.length, g.targets.length])).toEqual([['16 px', 2, 3], ['12 px', 1, 1]])
  })

  it('lists exact rows first, then check, near and no match', () => {
    const pool = [...POOL, variable('dimension/space/12', '12', SCOPES.gap), variable('other/space/12', '12', SCOPES.gap)]
    const groups = groupFindings([finding('1', 'A', 80), finding('2', 'B', 15), finding('3', 'C', 12), finding('4', 'D', 16)], pool)
    expect(groups.map((g) => g.match)).toEqual(['exact', 'check', 'near', 'none'])
  })

  it('keeps categories in order and the biggest groups first within a match', () => {
    const groups = groupFindings([
      finding('1', 'A', 80),
      finding('2', 'B', 90), finding('3', 'C', 90),
      fill('4', '#123456'),
    ], POOL)
    expect(groups.map((g) => g.current)).toEqual(['#123456', '90 px', '80 px'])
  })

  it('keeps the same value on different properties apart', () => {
    const groups = groupFindings([finding('1', 'A', 16), finding('2', 'B', 16, { property: 'Gap', target: { nodeId: '2', field: 'itemSpacing' } })], POOL)
    expect(groups).toHaveLength(2)
  })

  it('shows a partly transparent colour with its opacity', () => {
    const [g] = groupFindings([fill('1', '#333333', { opacity: 0.5 })], POOL)
    expect(g?.current).toBe('#333333 · 50%')
  })

  it('shows font weight without a unit', () => {
    const [g] = groupFindings([finding('1', 'A', 600, { category: 'typography', property: 'Font weight', scope: 'FONT_WEIGHT', target: { nodeId: '1', field: 'fontWeight' } })], POOL)
    expect(g?.current).toBe('600')
  })

  it('splits one value across modes, so each row is right for its own layers', () => {
    const groups = groupFindings([
      fill('1', '#101010', { context: context({ modes: { 'Brand UI': 'Bridge' } }) }),
      fill('2', '#101010', { context: context({ modes: { 'Brand UI': 'AkzoNobel' } }) }),
    ], POOL)
    expect(groups.map((g) => [g.mode, g.match])).toEqual([['Bridge', 'check'], ['AkzoNobel', 'none']])
  })

  it('splits one value when layers call for different variables', () => {
    const pool = [variable('jira/space/panel', '16', SCOPES.gap), variable('a11y/space/panel', '16', SCOPES.gap)]
    const groups = groupFindings([
      finding('1', 'A', 16, { context: context({ words: ['jira'] }) }),
      finding('2', 'B', 16, { context: context({ words: ['a11y'] }) }),
    ], pool)
    expect(groups.map((g) => g.candidates[0]?.name).sort()).toEqual(['a11y/space/panel', 'jira/space/panel'])
  })

  it('keeps layers it is sure about apart from ones it isn’t', () => {
    const pool = [variable('alpha/space/panel', '16', SCOPES.gap), variable('beta/space/panel', '16', SCOPES.gap)]
    const groups = groupFindings([
      finding('1', 'A', 16, { context: context({ words: ['alpha'] }) }),
      finding('2', 'B', 16),
    ], pool)
    expect(groups.map((g) => g.match)).toEqual(['exact', 'check'])
  })

  it('doesn’t split unsure rows on a guess', () => {
    const pool = [variable('alpha/space/panel', '16', SCOPES.gap), variable('beta/space/panel', '16', SCOPES.gap), variable('gamma/space/panel', '16', SCOPES.gap)]
    const groups = groupFindings([finding('1', 'A', 16), finding('2', 'B', 16, { context: context({ words: ['panels', 'gamma'], neighbours: [] }) }), finding('3', 'C', 16)], pool.slice(0, 2))
    expect(groups).toHaveLength(1)
    expect(groups[0]?.match).toBe('check')
  })

  it('doesn’t split near rows on a guess', () => {
    const pool = [variable('login/text/body', '#F7F7F7', SCOPES.text), variable('section/text/title', '#F7F7F7', SCOPES.text)]
    const text = (id: string, words: string[]) => fill(id, '#FAFAFA', { property: 'Text fill', scope: 'TEXT_FILL', context: context({ words }) })
    expect(groupFindings([text('1', ['login']), text('2', ['section'])], pool)).toHaveLength(1)
  })
})
