import { describe, it, expect } from 'vitest'
import { diffSnapshots } from '@shared/design/diff'
import type { ComponentEntry, Snapshot } from '@shared/design/types'
import type { FigmaGet } from '@shared/libraries/rest'
import { componentsFromNodes, readBranchInfo, readMainSnapshot, removedComponents, variablesFromRest } from './branch'

const VARIABLES = {
  meta: {
    variableCollections: { c1: { id: 'c1', name: 'Brand UI', defaultModeId: 'm1', modes: [{ modeId: 'm1', name: 'Bridge' }, { modeId: 'm2', name: 'Ikea' }] } },
    variables: {
      v1: { id: 'v1', key: 'k1', name: 'button/bg', variableCollectionId: 'c1', resolvedType: 'COLOR' as const, valuesByMode: { m1: { r: 0, g: 0.4, b: 1, a: 1 }, m2: { r: 1, g: 1, b: 1, a: 0.5 } }, description: 'Primary' },
      v2: { id: 'v2', key: 'k2', name: 'radius/control', variableCollectionId: 'c1', resolvedType: 'FLOAT' as const, valuesByMode: { m1: 6.00004, m2: { type: 'VARIABLE_ALIAS', id: 'v1' } } },
      v3: { id: 'v3', key: 'k3', name: 'imported', variableCollectionId: 'c1', resolvedType: 'FLOAT' as const, valuesByMode: { m1: 1, m2: 1 }, remote: true },
      v4: { id: 'v4', key: 'k4', name: 'orphan', variableCollectionId: 'gone', resolvedType: 'FLOAT' as const, valuesByMode: {} },
      v5: { id: 'v5', key: 'k5', name: 'flag', variableCollectionId: 'c1', resolvedType: 'BOOLEAN' as const, valuesByMode: { m1: true, m2: { type: 'VARIABLE_ALIAS', id: 'v3' } } },
    },
  },
}

const local = (over: Partial<ComponentEntry> = {}): ComponentEntry => ({ id: 'key-button', nodeId: '1:2', name: 'Button', page: 'Atoms', variants: 3, properties: ['Size', 'State'], description: 'A button', usesVariables: ['v1'], ...over })

describe('variablesFromRest', () => {
  it('formats values the way the plugin snapshot does and leaves imported variables out', () => {
    const out = variablesFromRest(VARIABLES)
    expect(out.map((v) => v.name)).toEqual(['button/bg', 'radius/control', 'flag'])
    expect(out[0]).toEqual({ id: 'v1', name: 'button/bg', collection: 'Brand UI', type: 'color', values: { Bridge: '#0066FF', Ikea: '#FFFFFF80' }, description: 'Primary' })
    expect(out[1]!.values).toEqual({ Bridge: '6', Ikea: '→ button/bg' })
    expect(out[2]!.values).toEqual({ Bridge: 'true', Ikea: '→ library variable' })
  })
})

describe('componentsFromNodes', () => {
  it('reads the main file’s side of each component and skips the ones it doesn’t have', () => {
    const out = componentsFromNodes([local(), local({ id: 'key-new', nodeId: '9:9', name: 'New' }), local({ id: 'no-node', nodeId: undefined })], {
      nodes: {
        '1:2': {
          document: { id: '1:2', name: 'Button', type: 'COMPONENT_SET', children: [{ id: 'a', name: 'State=Default', type: 'COMPONENT' }, { id: 'b', name: 'State=Hover', type: 'COMPONENT' }], componentPropertyDefinitions: { State: {}, 'Label#12:0': {} } },
          componentSets: { '1:2': { description: 'Old words' } },
        },
        '9:9': null,
      },
    })
    expect(out).toEqual([{ id: 'key-button', nodeId: '1:2', name: 'Button', page: 'Atoms', variants: 2, properties: ['Label', 'State'], description: 'Old words', usesVariables: [] }])
  })

  it('keeps the description when the node has no metadata, and counts a plain component as one variant', () => {
    const out = componentsFromNodes([local()], { nodes: { '1:2': { document: { id: '1:2', name: 'Button', type: 'COMPONENT' } } } })
    expect(out[0]).toMatchObject({ variants: 1, properties: [], description: 'A button' })
  })
})

describe('removedComponents', () => {
  it('lists published sets and standalone components the branch no longer has', () => {
    const out = removedComponents(new Set(['1:2']), {
      meta: { components: [
        { key: 'v-a', node_id: '5:1', name: 'State=On', containing_frame: { containingComponentSet: { nodeId: '5:0', name: 'Toggle' } } },
        { key: 'v-b', node_id: '5:2', name: 'State=Off', containing_frame: { containingStateGroup: { nodeId: '5:0', name: 'Toggle' } } },
        { key: 'k-icon', node_id: '6:0', name: 'Icon', description: 'Glyph', containing_frame: { pageName: 'Atoms' } },
        { key: 'k-kept', node_id: '1:2', name: 'Kept' },
      ] },
    }, { meta: { component_sets: [{ key: 'k-toggle', node_id: '5:0', name: 'Toggle', containing_frame: { pageName: 'Molecules' } }, { key: 'k-button', node_id: '1:2', name: 'Button' }] } })
    expect(out.map((c) => [c.id, c.name, c.page, c.variants])).toEqual([['k-toggle', 'Toggle', 'Molecules', 2], ['k-icon', 'Icon', 'Atoms', 1]])
  })
})

describe('readBranchInfo', () => {
  it('names the main file of a branch', async () => {
    const paths: string[] = []
    const get = (async (path: string) => { paths.push(path); return { name: 'button-refresh', mainFileKey: 'MAIN' } }) as FigmaGet
    expect(await readBranchInfo(get, 'BR/1')).toEqual({ name: 'button-refresh', mainFileKey: 'MAIN' })
    expect(paths).toEqual(['/files/BR%2F1?depth=1&branch_data=true'])
  })

  it('answers null for a file that is not a branch', async () => {
    expect(await readBranchInfo((async () => ({ name: 'Library' })) as FigmaGet, 'K')).toEqual({ name: 'Library', mainFileKey: null })
  })
})

describe('readMainSnapshot', () => {
  const branch: Snapshot = {
    takenAt: '2026-11-12T10:00:00.000Z',
    variables: [{ id: 'v1', name: 'button/bg', collection: 'Brand UI', type: 'color', values: { Bridge: '#0052CC', Ikea: '#FFFFFF80' }, description: 'Primary' }],
    components: [local(), local({ id: 'key-new', nodeId: '9:9', name: 'Chip' })],
  }
  const answers = (fail: (path: string) => boolean = () => false): FigmaGet => (async (path: string) => {
    if (fail(path)) throw new Error('missing scope')
    if (path.endsWith('/variables/local')) return { meta: { variableCollections: VARIABLES.meta.variableCollections, variables: { v1: VARIABLES.meta.variables.v1 } } }
    if (path.includes('/nodes?')) return { nodes: { '1:2': { document: { id: '1:2', name: 'Button', type: 'COMPONENT_SET', children: [{ id: 'a', name: 'x', type: 'COMPONENT' }, { id: 'b', name: 'y', type: 'COMPONENT' }, { id: 'c', name: 'z', type: 'COMPONENT' }], componentPropertyDefinitions: { Size: {}, State: {} } }, componentSets: { '1:2': { description: 'A button' } } }, '9:9': null } }
    if (path.endsWith('/component_sets')) return { meta: { component_sets: [{ key: 'k-toggle', node_id: '5:0', name: 'Toggle' }] } }
    return { meta: { components: [] } }
  }) as FigmaGet

  it('yields what the branch changed: a modified variable, an added and a removed component', async () => {
    const { snapshot, warnings } = await readMainSnapshot(answers(), 'MAIN', branch)
    expect(warnings).toEqual([])
    const changes = diffSnapshots(snapshot, branch)
    expect(changes.map((c) => `${c.subject} ${c.kind} ${c.name}`).sort()).toEqual(['component added Chip', 'component removed Toggle', 'variable modified button/bg'])
    expect(changes.find((c) => c.subject === 'variable')!.usedIn).toEqual(['Button', 'Chip'])
  })

  it('takes a part it cannot read as unchanged and says so', async () => {
    const { snapshot, warnings } = await readMainSnapshot(answers((p) => !p.includes('/nodes?')), 'MAIN', branch)
    expect(warnings).toEqual(['Variables were not compared: missing scope', 'Removed components were not checked: missing scope'])
    expect(diffSnapshots(snapshot, branch).map((c) => c.name)).toEqual(['Chip'])
    const none = await readMainSnapshot(answers(() => true), 'MAIN', branch)
    expect(none.warnings).toHaveLength(3)
    expect(diffSnapshots(none.snapshot, branch)).toEqual([])
  })
})
