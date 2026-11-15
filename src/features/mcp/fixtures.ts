// Sample data for the mock, the stories and the UI tests, so the default render reads like
// the Figma "MCP flow v3 · 600" screens. In Figma the selection, the readiness checks, each
// scenario's repository and the pull-request lookup are real (sandbox/); nothing here reaches
// a developer — the prompt and the MCP setup are built from the real selection (prompt.ts).
import { MCP_SCENARIO_LABEL, type McpScenario } from '@shared/integrations'
import type { ConnectionRowStatus, ReadinessMeterTone } from '@shared/ui'
import type { CheckStats, HandoffCheck, ImpactResult, LibraryRelease, SelectionInfo, TargetStatus, TrackResult, UsedComponent } from './messages'

export type HandoffScenarioId = 'ready' | 'not-ready' | 'screen'

export interface HandoffConnection {
  id: 'figma'
  name: string
  detail: string
  actionLabel: string
  status: ConnectionRowStatus
  /** The alternative the action switches to (e.g. the local Figma MCP server). */
  alternate: { detail: string; actionLabel: string }
}

export interface HandoffScenario {
  id: HandoffScenarioId
  selection: SelectionInfo
  readiness: { tone: ReadinessMeterTone; value: number }
  checks: readonly HandoffCheck[]
  stats: CheckStats
  components: readonly UsedComponent[]
}

export const STEPS = [{ label: 'Select' }, { label: 'Check' }, { label: 'Hand off' }, { label: 'Track' }] as const
/** The Library update scenario starts from a release, not a selection. */
export const LIBRARY_STEPS = [{ label: 'Changes' }, { label: 'Impact' }, { label: 'Hand off' }, { label: 'Track' }] as const

export const CONNECTIONS: readonly HandoffConnection[] = [
  {
    id: 'figma', name: 'Figma MCP server', detail: 'Remote · mcp.figma.com/mcp', actionLabel: 'Use local', status: 'good',
    alternate: { detail: 'Local · 127.0.0.1:3845/mcp', actionLabel: 'Use remote' },
  },
]

/** Settings › MCP + code sync as the fixtures assume it: every scenario has its own repository. */
export const SAMPLE_TARGETS: Record<McpScenario, TargetStatus> = {
  component: { connected: true, repo: 'acme/design-system', branch: 'main', framework: 'React + TypeScript', folder: 'src/components', designPackage: '', pullRequests: '' },
  screen: { connected: true, repo: 'acme/web', branch: 'develop', framework: 'React + TypeScript', folder: 'src/pages', designPackage: '@acme/ui', pullRequests: '' },
  library: { connected: true, repo: 'acme/web', branch: 'develop', framework: '', folder: '', designPackage: '', pullRequests: 'One per screen' },
}

/** A scenario nobody set up in Settings yet. */
export const noTarget = (scenario: McpScenario): TargetStatus => ({
  connected: false, repo: '', branch: 'main', framework: '', folder: '', designPackage: '', pullRequests: '',
  problem: `Add the repository and personal access token for ${MCP_SCENARIO_LABEL[scenario]} in Settings › MCP + code sync`,
})

/** Figma "Ticket Row" component set: what mcp:selection answers in the mock. */
export const TICKET_ROW: SelectionInfo = {
  nodeId: '40000267:8004', frame: 'Ticket Row', path: 'Molecules › Jira · 3 variants', type: 'COMPONENT_SET', variants: 3, layers: 42,
  description: 'One issue in the Jira tab’s ticket list: type, key, status, priority, points, assignee and summary.',
  variantAxes: [{ name: 'State', options: ['Default', 'Hover', 'Selected'] }],
  properties: ['Key', 'Title', 'Show assignee'],
}

/** A designer's screen, for the Screen to code scenario. */
export const CHECKOUT: SelectionInfo = {
  nodeId: '40002716:9813', frame: 'Checkout', path: 'Web › Checkout flow', type: 'FRAME', variants: 0, layers: 212,
  description: '', variantAxes: [], properties: [],
}

export const FILE_NAME = 'Bluebird · Plugin UI'

const READY_CHECKS: readonly HandoffCheck[] = [
  { id: 'components', status: 'pass', title: 'Components', detail: '14 of 14 instances come from the library' },
  { id: 'variables', status: 'warning', title: 'Variables', detail: '98% bound to variables · 1 unbound gap (6px)', actionLabel: 'Fix' },
  { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'Every frame uses auto layout' },
  { id: 'text', status: 'pass', title: 'Typography', detail: '7 text layers use text styles or typography variables' },
  { id: 'naming', status: 'warning', title: 'Layer names', detail: '1 layer keeps Figma’s default name: Frame 412', actionLabel: 'Rename' },
  { id: 'description', status: 'pass', title: 'Description', detail: 'The component description becomes the generated doc comment' },
]

const READY_STATS: CheckStats = {
  layers: 42, instances: 14, libraryInstances: 14, detached: 0, frames: 9, autoLayout: 9,
  boundPaints: 31, rawPaints: 0, boundNumbers: 18, rawNumbers: 1, texts: 7, styledTexts: 7, defaultNames: 1,
}

const READY_COMPONENTS: readonly UsedComponent[] = [
  { name: 'Meta Badge', count: 6, library: true },
  { name: 'Avatar', count: 3, library: true },
  { name: 'Issue Type', count: 3, library: true },
  { name: 'Priority Icon', count: 2, library: true },
]

const READY: HandoffScenario = {
  id: 'ready', selection: TICKET_ROW, readiness: { tone: 'success', value: 84 }, checks: READY_CHECKS, stats: READY_STATS, components: READY_COMPONENTS,
}

export const SCENARIOS: Record<HandoffScenarioId, HandoffScenario> = {
  /** Figma "MCP v3 · Component · 1 Select" … "3 Hand off". */
  ready: READY,
  /** Figma "MCP v2 · Error · Not ready": two failing checks lock Hand off. */
  'not-ready': {
    ...READY,
    id: 'not-ready',
    readiness: { tone: 'danger', value: 42 },
    checks: [
      { id: 'components', status: 'fail', title: 'Components', detail: '2 detached instances: Button, Dropdown', actionLabel: 'Reattach' },
      { id: 'variables', status: 'fail', title: 'Variables', detail: 'Only 65% bound to variables · 14 raw colours (#0C8CE9, #FFFFFF, #242424) · 3 unbound gaps (6px, 10px, 14px)', actionLabel: 'Fix all' },
      { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'Every frame uses auto layout' },
      { id: 'text', status: 'pass', title: 'Typography', detail: '7 text layers use text styles or typography variables' },
      { id: 'naming', status: 'pass', title: 'Layer names', detail: 'Every layer is named — names become class and prop names' },
      { id: 'description', status: 'pass', title: 'Description', detail: 'The component description becomes the generated doc comment' },
    ],
    stats: { ...READY_STATS, instances: 12, libraryInstances: 12, detached: 2, boundPaints: 17, rawPaints: 14, boundNumbers: 15, rawNumbers: 3, defaultNames: 0 },
  },
  /** Figma "MCP v3 · Screen · 1 Select" … "3 Hand off". */
  screen: {
    id: 'screen',
    selection: CHECKOUT,
    readiness: { tone: 'warning', value: 84 },
    checks: [
      { id: 'components', status: 'warning', title: 'Components', detail: '2 of 38 instances come from local components, not the library: Order Summary, Promo Banner', actionLabel: 'Publish' },
      { id: 'variables', status: 'warning', title: 'Variables', detail: '92% bound to variables · 3 raw colours (#0C8CE9, #FFFFFF, #242424)', actionLabel: 'Fix' },
      { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'Every frame uses auto layout' },
      { id: 'text', status: 'pass', title: 'Typography', detail: '31 text layers use text styles or typography variables' },
      { id: 'naming', status: 'pass', title: 'Layer names', detail: 'Every layer is named — names become class and prop names' },
    ],
    stats: { layers: 212, instances: 38, libraryInstances: 36, detached: 0, frames: 24, autoLayout: 24, boundPaints: 80, rawPaints: 3, boundNumbers: 61, rawNumbers: 0, texts: 31, styledTexts: 31, defaultNames: 0 },
    components: [
      { name: 'Button', count: 12, library: true },
      { name: 'Input Box', count: 6, library: true },
      { name: 'Dropdown', count: 4, library: true },
      { name: 'Order Summary', count: 1, library: false },
      { name: 'Promo Banner', count: 1, library: false },
    ],
  },
}

/** What mcp:track answers in the mock once the developer has opened the pull request. */
export const SAMPLE_PULL: Required<Pick<TrackResult, 'number' | 'url' | 'title'>> = {
  number: 63, url: 'https://github.com/acme/design-system/pull/63', title: 'feat: add Ticket Row',
}

/** Team History releases the mock lists (Figma "MCP v3 · Library update · 1 Changes"). */
export const SAMPLE_RELEASES: readonly LibraryRelease[] = [
  {
    id: 'cl1bridge2', kind: 'changelog', title: 'Bridge DS 2.0', at: '2026-11-14T10:20:00.000Z', by: 'Anita Rao', file: 'Bridge DS', ticket: 'BB-351',
    link: 'https://github.com/acme/design-system/pull/80',
    components: [
      { name: 'Button', change: 'modified', note: 'New Size property · padding tokens changed', breaking: false },
      { name: 'Date picker', change: 'modified', note: 'Header rebuilt · 2 new variants', breaking: false },
      { name: 'Toggle', change: 'removed', note: 'Replaced by Switch', breaking: true },
      { name: 'Switch', change: 'added', note: 'Replaces Toggle', breaking: false },
    ],
    variables: { added: 2, modified: 5, removed: 1 },
  },
  {
    id: 'ex1button', kind: 'extraction', title: 'Button refresh', at: '2026-11-12T08:05:00.000Z', by: 'Praveen Manchi', file: 'Bridge DS', ticket: 'BB-342',
    components: [{ name: 'Button', change: 'modified', note: 'button/bg/primary · radius/control · 12 variants', breaking: false }],
    variables: { added: 0, modified: 3, removed: 0 },
  },
]

/** What mcp:impact answers for Bridge DS 2.0 in the mock (Figma "MCP v3 · Library update · 2 Impact"). */
export const SAMPLE_IMPACT: ImpactResult = {
  screens: [
    { nodeId: '40002716:9813', name: 'Checkout', page: 'Web', uses: [{ name: 'Button', count: 12 }, { name: 'Toggle', count: 2 }] },
    { nodeId: '40002716:10491', name: 'Cart', page: 'Web', uses: [{ name: 'Button', count: 7 }, { name: 'Date picker', count: 2 }] },
    { nodeId: '40002716:11020', name: 'Sign in', page: 'Web', uses: [{ name: 'Toggle', count: 3 }] },
  ],
  pages: 4,
  scanned: 612,
  truncated: false,
}
