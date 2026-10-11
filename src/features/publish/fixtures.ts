// Sample snapshots for the mock transport, stories and tests. Diffing CURRENT
// against BASELINE reproduces the Figma "Publish flow v2" example: 12 changes
// since v3.0.0 — 3 added, 7 modified, 1 removed, 1 deprecated.
import type { ComponentEntry, ReleaseSummary, Snapshot, VariableEntry } from './types'

export const BRANDS = ['Bridge', 'Ikea', 'Richemont', 'Disney', 'Fiskars'] as const

const all = (value: string): Record<string, string> => Object.fromEntries(BRANDS.map((b) => [b, value]))
const v = (id: string, name: string, type: VariableEntry['type'], values: Record<string, string>, description = ''): VariableEntry =>
  ({ id, name, collection: 'Brand UI', type, values, description })
const c = (id: string, name: string, variants: number, properties: string[], usesVariables: string[], description = ''): ComponentEntry =>
  ({ id, name, page: 'Components', variants, properties: [...properties].sort(), description, usesVariables })

const BASE_VARIABLES: VariableEntry[] = [
  v('v1', 'button/bg/primary', 'color', all('#0C8CE9')),
  v('v2', 'text/secondary', 'color', all('#A4A4A4')),
  v('v3', 'radius/control', 'number', all('6')),
  v('v4', 'surface/translucent', 'color', all('#FFFFFF1A')),
  v('v5', 'space/row-x', 'number', all('12')),
  v('v6', 'text/link', 'color', all('#0C8CE9')),
  v('v7', 'surface/panel', 'color', all('#242424')),
]

const BASE_COMPONENTS: ComponentEntry[] = [
  c('k-button', 'Button', 6, ['Label', 'Size', 'State', 'Type'], ['v1', 'v2', 'v3']),
  c('k-tooltip', 'Tooltip', 2, ['Placement'], ['v4']),
  c('k-card', 'Card', 2, ['Elevated'], ['v7'], 'A surface for grouped content.'),
  c('k-modal', 'Modal', 1, [], ['v4', 'v7']),
  c('k-popover', 'Popover', 2, ['Placement'], ['v4']),
  c('k-sheet', 'Sheet', 2, ['Side'], ['v4']),
  c('k-tab', 'Tab', 3, ['State'], ['v1']),
  c('k-toggle', 'Toggle', 4, ['Checked', 'State'], ['v1']),
]

export const BASELINE: Snapshot = { takenAt: '2026-10-09T14:32:00.000Z', variables: BASE_VARIABLES, components: BASE_COMPONENTS }

export const CURRENT: Snapshot = {
  takenAt: '2026-10-11T16:01:00.000Z',
  variables: [
    v('v1', 'button/bg/primary', 'color', { Bridge: '#0560A3', Ikea: '#0560A3', Richemont: '#0560A3', Disney: '#0C8CE9', Fiskars: '#0C8CE9' }),
    v('v2', 'text/secondary', 'color', all('#C4C4C4')),
    v('v3', 'radius/control', 'number', all('8')),
    v('v5', 'space/row-x', 'number', all('16')),
    v('v6', 'text/link', 'color', { ...all('#0C8CE9'), Ikea: '#0058A3' }),
    v('v7', 'surface/panel', 'color', all('#242424')),
    v('v8', 'feedback/info', 'color', all('#007BE5')),
    v('v9', 'surface/overlay', 'color', all('#00000066')),
  ],
  components: [
    c('k-button', 'Button', 7, ['Size', 'State', 'Text', 'Type'], ['v1', 'v2', 'v3']),
    c('k-tooltip', 'Tooltip', 2, ['Placement'], ['v9'], 'Deprecated — use Popover.'),
    c('k-card', 'Card', 2, ['Elevated'], ['v7'], 'A surface for grouped content. Use Elevated for floating cards.'),
    c('k-modal', 'Modal', 1, [], ['v9', 'v7']),
    c('k-popover', 'Popover', 2, ['Placement'], ['v9']),
    c('k-sheet', 'Sheet', 2, ['Side'], ['v9']),
    c('k-tab', 'Tab', 3, ['State'], ['v1']),
    c('k-toggle', 'Toggle', 4, ['Checked', 'State'], ['v1']),
    c('k-date-picker', 'Date picker', 6, ['Range', 'Size', 'State', 'Week start'], ['v1', 'v9']),
  ],
}

export const BASELINE_RELEASE: ReleaseSummary = { version: 'v3.0.0', title: 'Brand UI layering, Disney and Fiskars modes', publishedAt: '2026-10-09T14:32:00.000Z', changes: 31 }

export const HISTORY: readonly ReleaseSummary[] = [
  BASELINE_RELEASE,
  { version: 'v2.4.0', title: 'Jira tokens, 2 px focus ring', publishedAt: '2026-10-02T10:12:00.000Z', changes: 9 },
  { version: 'v2.3.2', title: 'Tooltip contrast fix (retry)', publishedAt: '2026-09-28T09:40:00.000Z', changes: 2 },
]

export const SAMPLE_REPO = { connected: true, repo: 'praveenmanchi/bridge-ds-site', branch: 'main' } as const
export const SAMPLE_SITE = 'ds.bridge.design'
