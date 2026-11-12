// Sample snapshots for the mock transport, stories and tests. Diffing CURRENT
// against BASELINE gives the Figma "Extraction v2" example: variable changes
// (added, modified, removed) and the components they touch.
import type { ComponentEntry, Snapshot, VariableEntry } from '@shared/design/types'
import type { BranchInfo } from './messages'

export const MODES = ['Bridge', 'Ikea', 'Gap'] as const

const all = (value: string): Record<string, string> => Object.fromEntries(MODES.map((m) => [m, value]))
const v = (id: string, name: string, type: VariableEntry['type'], values: Record<string, string>): VariableEntry =>
  ({ id, name, collection: 'Brand UI', type, values, description: '' })
const c = (id: string, name: string, variants: number, usesVariables: string[]): ComponentEntry =>
  ({ id, name, page: 'Components', variants, properties: ['State'], description: '', usesVariables })

export const BASELINE: Snapshot = {
  takenAt: '2026-11-08T14:20:00.000Z',
  variables: [
    v('v1', 'button/bg/primary', 'color', all('#0C8CE9')),
    v('v2', 'text/secondary', 'color', all('#A4A4A4')),
    v('v3', 'radius/control', 'number', all('6')),
    v('v4', 'surface/translucent', 'color', all('#FFFFFF1A')),
    v('v5', 'surface/panel', 'color', all('#242424')),
  ],
  components: [
    c('k-button', 'Button', 12, ['v1', 'v3']),
    c('k-date', 'Date picker', 4, ['v1', 'v2']),
    c('k-toggle', 'Toggle', 4, ['v4']),
    c('k-tab', 'Tab', 4, ['v3']),
    c('k-card', 'Card', 2, ['v5']),
  ],
}

export const CURRENT: Snapshot = {
  takenAt: '2026-11-12T09:32:00.000Z',
  variables: [
    v('v1', 'button/bg/primary', 'color', { Bridge: '#0978C8', Ikea: '#0978C8', Gap: '#0C8CE9' }),
    v('v2', 'text/secondary', 'color', all('#C4C4C4')),
    v('v3', 'radius/control', 'number', all('8')),
    v('v5', 'surface/panel', 'color', all('#242424')),
    v('v6', 'feedback/info', 'color', all('#007BE5')),
    v('v7', 'space/inline-lg', 'number', all('12')),
  ],
  components: [
    c('k-button', 'Button', 12, ['v1', 'v3']),
    c('k-date', 'Date picker', 4, ['v1', 'v2']),
    c('k-toggle', 'Toggle', 4, []),
    c('k-tab', 'Tab', 4, ['v3']),
    c('k-card', 'Card', 2, ['v5']),
    c('k-notice', 'Notice', 2, ['v6']),
  ],
}

export const SAMPLE_REPO = 'praveenmanchi/bridge-ds-tokens'

export const BRANCHES: readonly BranchInfo[] = [
  { name: 'main', latest: { by: 'Praveen Manchi', at: '2026-11-08T14:20:00.000Z' } },
  { name: 'develop', latest: { by: 'Anita Rao', at: '2026-11-08T11:02:00.000Z' } },
  { name: 'release/v4.0.0', latest: { by: 'Praveen Manchi', at: '2026-10-24T10:05:00.000Z' } },
  { name: 'feature/a11y-report-tokens', latest: null },
]
