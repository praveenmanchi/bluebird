// Sample data copied from the Figma "UX AI" screens, so the default render reads
// like the design. No network: every answer below is canned.
import type { IconName, MetaBadgeTone, VariableRowKind } from '@shared/ui'
import type { LibraryIndex } from '@shared/libraries'
import type { GroundedAnswer } from './grounding'
import type { SelectionContext } from './messages'

/** An attached knowledge source (Figma "Source Card"). */
export interface Source {
  id: string
  name: string
  meta: string
  /** Short label used by the Sources bar chips. */
  chip: string
  icon: IconName
  status: string
  statusTone: MetaBadgeTone
  selected: boolean
}

export const SOURCES: readonly Source[] = [
  { id: 'brand-ui', name: 'Brand UI variables', chip: 'Brand UI variables', meta: 'Variables · 421 tokens · 5 brand modes', icon: 'variables', status: 'Indexed', statusTone: 'success', selected: true },
  { id: 'components', name: 'Components library', chip: 'Components', meta: 'Components · 87 sets · 34 atoms, 41 molecules, 12 organisms', icon: 'component', status: 'Indexed', statusTone: 'success', selected: true },
  { id: 'icons', name: 'Iconography', chip: 'Icons', meta: 'Icons · 69 glyphs · 16 / 24 px', icon: 'layers', status: 'Indexed', statusTone: 'success', selected: true },
  { id: 'type', name: 'Typography styles', chip: 'Type styles', meta: 'Type · 12 styles · Noto Sans, MuseoModerno, Noto Serif', icon: 'text', status: 'Indexed', statusTone: 'success', selected: true },
  { id: 'guidelines', name: 'Brand guidelines.pdf', chip: 'Brand guidelines', meta: 'Docs · 48 pages · uploaded today', icon: 'documentation', status: 'Indexing 62%', statusTone: 'accent', selected: true },
  { id: 'tokens-export', name: 'tokens-export.json', chip: 'tokens-export.json', meta: 'Data · 1.2 MB · line 1840: unexpected token', icon: 'json', status: 'Failed', statusTone: 'danger', selected: false },
]

/** How many source chips the Sources bar names before collapsing the rest into "+N". */
export const SOURCE_CHIPS_SHOWN = 4

export interface Suggestion { label: string; icon: IconName }

/** Figma "Welcome / Suggestions". */
export const WELCOME_PROMPTS: readonly Suggestion[] = [
  { label: 'What is our primary colour?', icon: 'colors' },
  { label: 'Show me the Button atom', icon: 'component' },
  { label: 'Which icons mean status?', icon: 'section-frame' },
  { label: 'What variables does my selection use?', icon: 'component-select' },
]

export type AnswerKind = 'color' | 'component' | 'type' | 'icons' | 'selection'

export type TurnStatus = 'thinking' | 'done' | 'stopped'

/** One question and its (canned) answer. */
export interface Turn {
  id: string
  prompt: string
  kind: AnswerKind
  status: TurnStatus
  /** Thinking Steps finished so far while `status` is thinking. */
  progress: number
  /** Set when the answer comes from the Dual File libraries instead of the canned copy. */
  grounded?: GroundedAnswer
}

/** One canned assistant reply. */
export interface CannedAnswer {
  /** Assistant message copy. */
  text: string
  /** Assistant message copy while the answer is still being worked out. */
  searching: string
  /** Chat Input hint while generating. */
  hint: string
  /** Visible reasoning, shown as Thinking Steps. Empty = no reasoning block. */
  steps: readonly string[]
  /** "Thought for Ns". */
  thoughtFor: string
  /** Follow-up Prompt Chips under the latest answer. */
  followUps: readonly Suggestion[]
}

export const ANSWERS: Record<AnswerKind, CannedAnswer> = {
  color: {
    text: 'Your primary colour is surface/accent. It drives primary buttons, the tab indicator and avatars, and it changes with the brand:',
    searching: 'Searching your variables…',
    hint: 'Reading Brand UI…',
    steps: ['Searched Variables · Brand UI (421 tokens, 5 modes)', 'Matched surface/accent via button/primary/bg/default'],
    thoughtFor: 'Thought for 2s',
    followUps: [
      { label: 'Check contrast in every brand', icon: 'colors' },
      { label: 'Where is surface/accent used?', icon: 'section-frame' },
      { label: 'Swap it on my selection', icon: 'component-select' },
    ],
  },
  component: {
    text: 'Button is an atom on the Components page with 12 variants. Here it is live; Go to component opens it in Figma.',
    searching: 'Searching your components…',
    hint: 'Reading Components library…',
    steps: ['Searched Components library (87 sets)', 'Found Button · Atoms · Code Connect → src/shared/ui/Button'],
    thoughtFor: 'Thought for 3s',
    followUps: [],
  },
  type: {
    text: 'The Banner uses four levels of the Noto Sans scale. The family comes from Brand UI, so Bridge shows MuseoModerno for display text.',
    searching: 'Searching your type styles…',
    hint: 'Reading Typography styles…',
    steps: [],
    thoughtFor: 'Thought for 2s',
    followUps: [],
  },
  icons: {
    text: 'Status uses the four Status error icons: good, issue, error and retry. They live in Iconography and the Components page.',
    searching: 'Searching your iconography…',
    hint: 'Searching Iconography…',
    steps: ['Read Iconography · 69 glyphs', 'Read Components · Status error icons (4 variants)', 'Matching “status” in names, tags and usage…'],
    thoughtFor: 'Thought for 3s',
    followUps: [],
  },
  selection: {
    text: 'Ticket Row binds 16 variables. Swap any of them here, then press Apply.',
    searching: 'Reading your selection…',
    hint: 'Reading your selection…',
    steps: [],
    thoughtFor: 'Thought for 1s',
    followUps: [],
  },
}

/** Which canned answer a prompt gets. Order matters: a swap on a selection beats the colour words in it. */
export function answerKindFor(prompt: string): AnswerKind {
  const p = prompt.toLowerCase()
  if (/selection|selected|swap|used in this|this layer/.test(p)) return 'selection'
  if (/component|button|atom/.test(p)) return 'component'
  if (/\btype\b|font|typograph|text style/.test(p)) return 'type'
  if (/icon/.test(p)) return 'icons'
  return 'color'
}

/** Nodes "Go to component" and "Select on canvas" reveal (Figma set ids of Button and Ticket Row). */
export const NODES = {
  button: '40000040:5139',
  ticketRow: '40000267:8055',
} as const

/** Figma "Selection Preview". */
export const SELECTION = {
  name: 'Ticket Row',
  meta: 'Component · State=Selected · Components › Jira',
  chip: 'Ticket Row · State=Selected',
} as const

/** One bound variable in the "Variables in Ticket Row" panel. */
export interface BoundVariable {
  /** The variable bound on the layer today (Figma "Token"). */
  token: string
  /** Property · layer [· current value]. */
  where: string
  kind: VariableRowKind
  /** Kind=Number: the value shown in the preview tile. */
  amount?: string
  /** The variable the Swap dropdown points at; differs from `token` while a swap is pending. */
  value: string
}

/** Figma rows. The first is mid-swap (State=Changed) in the design. */
export const VARIABLES: readonly BoundVariable[] = [
  { token: 'jira/row/bg/selected', where: 'Fill · root', kind: 'color', value: 'surface/accent' },
  { token: 'jira/row/border/selected', where: 'Stroke · root', kind: 'color', value: 'jira/row/border/selected' },
  { token: 'jira/text/key', where: 'Text fill · Key', kind: 'color', value: 'jira/text/key' },
  { token: 'jira/space/row-x', where: 'Padding left / right · root · 12', kind: 'number', amount: '12', value: 'jira/space/row-x' },
  { token: 'jira/radius/row', where: 'Corner radius · root · 4', kind: 'number', amount: '4', value: 'jira/radius/row' },
]

/** What the Swap menus offer, per kind. Every name is a generated variable. */
export const SWAP_OPTIONS: Record<VariableRowKind, readonly string[]> = {
  color: ['surface/accent', 'surface/accent-subtle', 'jira/row/bg/selected', 'jira/row/border/selected', 'jira/text/key'],
  number: ['jira/space/row-x', 'jira/radius/row', 'space/inset-lg-alt'],
}

export const VARIABLES_PANEL = {
  title: 'Variables in Ticket Row',
  subtitle: '16 bound · showing 5 · Brand UI mode: Bridge',
  action: 'Show all 16',
  /** "1 change · 3 variants": the Ticket Row set the swap would touch. */
  variants: 3,
} as const

export type PanelMode = 'swap' | 'edit'
export const PANEL_MODES: readonly { value: PanelMode; label: string; icon: IconName }[] = [
  { value: 'swap', label: 'Swap binding', icon: 'ui-shape-instance-swap' },
  { value: 'edit', label: 'Edit value', icon: 'ui-sidebar-edit' },
]

/** The conversations each Figma screen shows (stories and view tests). */
export const SCREEN_THREADS: Record<'answer' | 'component' | 'thinking' | 'selection', readonly Turn[]> = {
  answer: [{ id: 'a1', prompt: 'What is our primary colour?', kind: 'color', status: 'done', progress: 2 }],
  component: [{ id: 'c1', prompt: 'Show me the Button atom', kind: 'component', status: 'done', progress: 2 }],
  thinking: [
    { id: 't1', prompt: 'Which type styles does the Banner use?', kind: 'type', status: 'done', progress: 1 },
    { id: 't2', prompt: 'Which icons do we use for status?', kind: 'icons', status: 'thinking', progress: 2 },
  ],
  selection: [{ id: 's1', prompt: 'What variables are used in this?', kind: 'selection', status: 'done', progress: 1 }],
}

/** What the dev harness "selects" (no Figma there): Ticket Row, bound to library variables by name. */
export const MOCK_SELECTION: SelectionContext = {
  name: 'Ticket Row', type: 'INSTANCE', nodes: 14, truncated: false, selected: 1,
  variables: [
    { name: 'jira/row/bg/selected', key: 'mock-row-bg', remote: true, properties: ['fills'], layers: 1 },
    { name: 'jira/row/border/selected', key: 'mock-row-border', remote: true, properties: ['strokes'], layers: 1 },
    { name: 'jira/text/key', key: 'mock-text-key', remote: true, properties: ['fills'], layers: 2 },
    { name: 'jira/space/row-x', key: 'mock-row-x', remote: true, properties: ['paddingLeft', 'paddingRight'], layers: 1 },
    { name: 'ticket/legacy-blue', key: 'local-legacy', remote: false, properties: ['fills'], layers: 1 },
  ],
  components: [
    { name: 'Ticket Row', key: 'mock-ticket-row', remote: true, count: 1 },
    { name: 'Status error icons', key: 'mock-status', remote: true, count: 2 },
    { name: 'Avatar', key: 'mock-avatar', remote: false, count: 1 },
  ],
}

/** A small library index for stories and tests, shaped like a real Dual File load. */
export const SAMPLE_LIBRARY: LibraryIndex = {
  loadedAt: 0,
  files: [
    { slot: 1, fileKey: 'VARS1', name: 'Brand UI', roles: ['variables'], variables: 4, components: 0, styles: 3, collections: ['Brand UI'] },
    { slot: 2, fileKey: 'COMP2', name: 'Components', roles: ['components'], variables: 0, components: 3, collections: [] },
  ],
  styles: [
    { kind: 'text', key: 'ks-title', nodeId: '50:1', name: 'Title/Semantics', description: 'Section titles', fontFamily: 'Noto Sans', fontStyle: 'Semi Bold', fontWeight: 600, fontSize: 16, lineHeight: 22.4, letterSpacing: 0, fileKey: 'VARS1' },
    { kind: 'text', key: 'ks-body', nodeId: '50:2', name: 'Body/Regular', description: '', fontFamily: 'Noto Sans', fontStyle: 'Regular', fontWeight: 400, fontSize: 11, lineHeight: 15.4, letterSpacing: 0, fileKey: 'VARS1' },
    { kind: 'color', key: 'ks-accent', nodeId: '50:3', name: 'Legacy/Accent', description: 'Pre-variables accent', hex: '#0C8CE9', fileKey: 'VARS1' },
  ],
  collections: [{ name: 'Brand UI', modes: ['Bridge', 'Ikea'], variables: 4, fileKey: 'VARS1' }],
  variables: [
    { id: 'v1', key: 'k-accent', name: 'surface/accent', collection: 'Brand UI', type: 'COLOR', description: 'Primary actions and selection', scopes: [], fileKey: 'VARS1', values: [{ mode: 'Bridge', value: '#0C8CE9', aliasOf: 'blue/500' }, { mode: 'Ikea', value: '#161616' }] },
    { id: 'v2', key: 'mock-row-bg', name: 'jira/row/bg/selected', collection: 'Brand UI', type: 'COLOR', description: '', scopes: [], fileKey: 'VARS1', values: [{ mode: 'Bridge', value: '#0B3A6E' }, { mode: 'Ikea', value: '#E8F0FF' }] },
    { id: 'v3', key: 'other-key', name: 'jira/text/key', collection: 'Brand UI', type: 'COLOR', description: '', scopes: [], fileKey: 'VARS1', values: [{ mode: 'Bridge', value: '#7AB8FF' }, { mode: 'Ikea', value: '#0058A3' }] },
    { id: 'v4', key: 'mock-row-x', name: 'jira/space/row-x', collection: 'Brand UI', type: 'FLOAT', description: '', scopes: [], fileKey: 'VARS1', values: [{ mode: 'Bridge', value: '12' }, { mode: 'Ikea', value: '12' }] },
  ],
  components: [
    { key: 'k-button', nodeId: '40000040:5139', name: 'Button', kind: 'set', description: 'Primary call to action', location: 'Components › Atoms', variants: 12, keys: ['k-button'], fileKey: 'COMP2' },
    { key: 'k-row', nodeId: '40000267:8055', name: 'Ticket Row', kind: 'set', description: '', location: 'Components › Jira', variants: 3, keys: ['k-row', 'mock-ticket-row'], fileKey: 'COMP2' },
    { key: 'k-status', nodeId: '1:2', name: 'Status error icons', kind: 'set', description: 'good, issue, error, retry', location: 'Components › Atoms', variants: 4, keys: ['k-status', 'mock-status'], fileKey: 'COMP2' },
  ],
}
