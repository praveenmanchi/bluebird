// Fixture handlers for browser-only development (?mode=mock) and UI tests.
// The values and layers are a real check of the Login page's "Page header" frame
// (2026-11-06) and go through the real matcher against part of the real library.
import type { HandlerMap } from '@shared/bridge'
import type { LibraryVariable } from '@shared/libraries/types'
import { groupFindings } from './match'
import { wordsOf } from './rank'
import {
  MSG, type BindField, type BindResult, type Category, type CheckResult, type Finding, type GotoResult, type SelectResult, type SourceInfo, type UndoResult, type ValueScope,
} from './messages'

export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

const variable = (name: string, value: string, scope: string, collection = 'Brand UI'): LibraryVariable => ({
  id: name, key: `key:${name}`, name, collection, type: value.startsWith('#') ? 'COLOR' : 'FLOAT', description: '', scopes: [scope],
  values: [{ mode: collection === 'Brand UI' ? 'Bridge' : 'Value', value, aliasOf: 'primitive' }, ...(collection === 'Brand UI' ? [{ mode: 'Ikea', value, aliasOf: 'primitive' }] : [])], fileKey: 'mock',
})
const each = (scope: string, list: readonly (readonly [string, string])[], collection?: string) => list.map(([n, v]) => variable(n, v, scope, collection))
const named = (scope: string, value: string, names: readonly string[], collection?: string) => names.map((n) => variable(n, value, scope, collection))

export const MOCK_VARIABLES: readonly LibraryVariable[] = [
  ...named('TEXT_FILL', '#F7F7F7', ['login/text/body', 'section-header/title/fg', 'text/secondary']),
  ...named('TEXT_FILL', '#A4A4A4', ['login/text/meta', 'text/tertiary']),
  ...each('TEXT_FILL', [['text/placeholder', '#757575'], ['text/accent', '#007BE5']]),
  ...named('ALL_FILLS', '#151515', ['docs/page/surface/page', 'login/surface/page']),
  ...named('ALL_FILLS', '#333333', ['docs/page/surface/card', 'input/bg/default']),
  ...named('STROKE_COLOR', '#4D4D4D', ['section-header/divider/color', 'border/default']),
  ...each('CORNER_RADIUS', [['radius/sm', '2'], ['radius/md', '4'], ['radius/lg', '6'], ['radius/xl', '8'], ['radius/pill', '100'], ['dimension/radius/full', '100']]),
  ...named('STROKE_FLOAT', '1', ['border-width/default', 'a11y/border-width', 'agents/border-width', 'dimension/stroke/1']),
  ...named('GAP', '16', ['docs/page/space/stack', 'settings/space/page-gap', 'a11y/space/panel', 'agents/space/panel', 'dimension/space/16', 'docs/space/panel']),
  ...named('GAP', '12', ['docs/page/space/cell-x', 'section-header/padding', 'a11y/space/section', 'dimension/space/12']),
  ...named('GAP', '64', ['docs/page/space/margin', 'dimension/space/64']),
  ...each('GAP', [['dimension/space/32', '32'], ['dimension/space/9', '9'], ['dimension/space/11', '11'], ['dimension/space/18', '18']], 'Foundations'),
  ...named('FONT_SIZE', '14', ['docs/page/font/size-body', 'type/size/14']),
  ...named('FONT_SIZE', '16', ['app-header/wordmark/font-size', 'docs/page/font/size-h3', 'font/size-title', 'type/size/16']),
  ...named('FONT_SIZE', '20', ['login/font/title-size', 'type/size/20']),
]

let nextId = 0

const MODES = { 'Brand UI': 'Bridge' }

function values(category: Category, property: string, value: number | string, scope: ValueScope, fields: BindField | readonly BindField[], layers: readonly (readonly [string, string])[]): Finding[] {
  return layers.flatMap(([name, path]) => {
    const id = `n:${(nextId += 1)}`
    const context = { modes: MODES, words: wordsOf(`${path} ${name}`), neighbours: [] }
    return [fields].flat().map((field): Finding => ({
      category, property, value, scope, layer: { id, name, path }, context,
      target: { nodeId: id, field, ...(field === 'fills' || field === 'strokes' ? { paintIndex: 0 } : {}) },
    }))
  })
}

const HEADER = 'Page header'
const CONTENTS = 'Page header › Contents'
const chips = (n: number) => Array.from({ length: n }, () => ['Frame', CONTENTS] as const)
const TEXT = 'Text fill'
const SIZE = 'Font size'
const SIDES: readonly BindField[] = ['paddingLeft', 'paddingRight']

export const MOCK_FINDINGS: readonly Finding[] = [
  ...values('colors', TEXT, '#FAFAFA', 'TEXT_FILL', 'fills', [['Login', HEADER], ['Login Page · before redesign (archive)', CONTENTS], ['Access code flow', CONTENTS], ['SSO flow', CONTENTS], ['Error states', CONTENTS]]),
  ...values('colors', 'Fill', '#26262B', 'FRAME_FILL', 'fills', chips(4)),
  ...values('colors', TEXT, '#60A5FA', 'TEXT_FILL', 'fills', [['← PAGES', 'Page header › Pagination'], ['Onboarding →', 'Page header › Pagination']]),
  ...values('colors', 'Stroke', '#3F3F46', 'STROKE_COLOR', 'strokes', [[HEADER, 'Login']]),
  ...values('colors', 'Fill', '#18181B', 'FRAME_FILL', 'fills', [[HEADER, 'Login']]),
  ...values('colors', TEXT, '#A1A1AA', 'TEXT_FILL', 'fills', [['Breadcrumb', HEADER]]),
  ...values('colors', TEXT, '#D4D4D8', 'TEXT_FILL', 'fills', [['Description', HEADER]]),
  ...values('colors', TEXT, '#71717A', 'TEXT_FILL', 'fills', [['Page 1 of 10', 'Page header › Pagination']]),
  ...values('border', 'Corner radius', 999, 'CORNER_RADIUS', 'cornerRadius', chips(4)),
  ...values('border', 'Corner radius', 24, 'CORNER_RADIUS', 'cornerRadius', [[HEADER, 'Login']]),
  ...values('border', 'Stroke width', 1, 'STROKE_FLOAT', 'strokeWeight', [[HEADER, 'Login']]),
  ...values('spacing', 'Padding', 16, 'GAP', SIDES, chips(4)),
  ...values('spacing', 'Padding', 10, 'GAP', SIDES, chips(4)),
  ...values('spacing', 'Gap', 20, 'GAP', 'itemSpacing', [[HEADER, 'Login']]),
  ...values('spacing', 'Padding', 80, 'GAP', SIDES, [[HEADER, 'Login']]),
  ...values('spacing', 'Padding', 64, 'GAP', SIDES, [[HEADER, 'Login']]),
  ...values('spacing', 'Gap', 12, 'GAP', 'itemSpacing', [['Contents', HEADER]]),
  ...values('spacing', 'Gap', 32, 'GAP', 'itemSpacing', [['Pagination', HEADER]]),
  ...values('typography', SIZE, 18, 'FONT_SIZE', 'fontSize', [['Description', HEADER], ['← PAGES', 'Page header › Pagination'], ['Page 1 of 10', 'Page header › Pagination'], ['Onboarding →', 'Page header › Pagination']]),
  ...values('typography', SIZE, 14, 'FONT_SIZE', 'fontSize', [['Login Page · before redesign (archive)', CONTENTS], ['Access code flow', CONTENTS], ['SSO flow', CONTENTS], ['Error states', CONTENTS]]),
  ...values('typography', SIZE, 16, 'FONT_SIZE', 'fontSize', [['Breadcrumb', HEADER]]),
  ...values('typography', SIZE, 72, 'FONT_SIZE', 'fontSize', [['Login', HEADER]]),
]

const SOURCE: SourceInfo = { name: 'Bluebird UI', variables: 1633 }

export function mockResult(): CheckResult {
  return {
    status: 'ready', source: SOURCE,
    selection: { name: 'Page header', meta: `Frame on Login · ${MOCK_FINDINGS.length} hard-coded values · Bridge mode` },
    groups: groupFindings(MOCK_FINDINGS, MOCK_VARIABLES), visited: 112, skippedInstances: 0,
  }
}

export function createMockHandlers(scenario: MockScenario = 'default'): HandlerMap {
  return {
    [MSG.check]: async (): Promise<CheckResult> => {
      if (scenario === 'empty') return { status: 'no-selection', source: SOURCE }
      if (scenario === 'error') return { status: 'source-failed', message: 'File 1: Figma answered 403. Check the key in Settings › Dual File Mode.' }
      return mockResult()
    },
    [MSG.bind]: async (payload: { variableKey: string; targets: readonly unknown[] }): Promise<BindResult> =>
      ({ bound: payload.targets.length, skipped: 0, restored: 0, restoredLayers: 0, stuck: 0, variable: payload.variableKey.replace(/^key:/, ''), undoId: `undo:${payload.variableKey}` }),
    [MSG.undo]: async (): Promise<UndoResult> => ({ restored: 1, skipped: 0 }),
    [MSG.select]: async (payload: { nodeIds: readonly string[] }): Promise<SelectResult> => ({ selected: payload.nodeIds.length, page: 'Login' }),
    [MSG.goto]: async (): Promise<GotoResult> => ({ page: 'Login', name: 'Page header' }),
  }
}
