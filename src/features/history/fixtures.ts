// Sample entries for the mock transport, stories and tests — the Figma
// "History · 600" examples, one per entry type, with full details. Times are
// relative to `now` so Today / Yesterday / Earlier this week always group.
import type { Change } from '@shared/design/types'
import type { HistoryEntry } from '@shared/history/types'
import { changelogEntry } from './changelog'
import type { FileVersion, TicketOption, VersionDiff } from './messages'

const ago = (now: Date, hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString()

const mode = (m: string, old: string, next: string) => ({ mode: m, state: 'changed' as const, kind: 'color' as const, old, new: next })
const same = (m: string, value: string, kind: 'color' | 'number' = 'color') => ({ mode: m, state: 'unchanged' as const, kind, value })

/** What the sample branch "button-refresh" changed against its main file. */
export const SAMPLE_CHANGES: readonly Change[] = [
  { id: 'variable:v-translucent', subject: 'variable', kind: 'removed', preview: 'color', name: 'surface/translucent', detail: 'Removed · used by 1 component', breaking: true, swatch: '#FFFFFF1A', modeValues: [same('Bridge', '#FFFFFF1A'), same('Ikea', '#FFFFFF1A')], usedIn: ['Toggle'], source: 'Brand UI › surface/translucent' },
  { id: 'variable:v-info', subject: 'variable', kind: 'added', preview: 'color', name: 'feedback/info', detail: 'New · #007BE5', breaking: false, swatch: '#007BE5', modeValues: [same('Bridge', '#007BE5'), same('Ikea', '#007BE5')], usedIn: ['Notice'], source: 'Brand UI › feedback/info' },
  { id: 'variable:v-primary', subject: 'variable', kind: 'modified', preview: 'color', name: 'button/bg/primary', detail: '#0C8CE9 → #0978C8 · 1 of 2 brands', breaking: false, swatch: '#0978C8', modeValues: [mode('Bridge', '#0C8CE9', '#0978C8'), same('Ikea', '#0058A3')], usedIn: ['Button', 'Date picker'], source: 'Brand UI › button/bg/primary' },
  { id: 'variable:v-radius', subject: 'variable', kind: 'modified', preview: 'number', name: 'radius/control', detail: '6 → 8', breaking: false, modeValues: [{ mode: 'Value', state: 'changed', kind: 'number', old: '6', new: '8' }], usedIn: ['Button', 'Tab'], source: 'Semantics › radius/control' },
  { id: 'component:c-chip', subject: 'component', kind: 'added', preview: 'component', name: 'Filter chip', detail: 'New · 4 variants · 3 properties', breaking: false, modeValues: [], usedIn: [], source: 'Atoms › Filter chip' },
  { id: 'component:c-button', subject: 'component', kind: 'modified', preview: 'component', name: 'Button', detail: '+2 variants · +Loading', breaking: false, modeValues: [], usedIn: [], source: 'Atoms › Button' },
]

type Seed = Omit<HistoryEntry, 'schema' | 'at'> & { hoursAgo: number }

const SEEDS: Seed[] = [
  {
    id: 'ex1button', hoursAgo: 0.5, type: 'extraction', status: 'done', title: 'Button refresh', ticket: 'BB-342',
    summary: 'Extraction pushed to develop · PR #74 · Project Bluebird UI', by: { name: 'Praveen Manchi', team: 'Design System' }, file: 'Project Bluebird UI',
    variables: '2 added · 5 modified · 1 removed', components: '6 components', link: { url: 'https://github.com/praveenmanchi/bridge-ds-tokens/pull/74', label: 'Open pull request #74' },
    details: {
      description: 'The primary background is darker so white labels pass AA in Bridge and Ikea, control radius goes from 6 to 8, and feedback/info is new for the Info notice. surface/translucent is removed — use surface/overlay.',
      facts: [{ label: 'Compared with', value: 'main · Praveen Manchi, 8 Nov 2026, 14:20' }, { label: 'Pushed to', value: 'develop · commit 4f2a91c' }, { label: 'Pull request', value: '#74 develop → main · open' }, { label: 'Pipeline', value: '#512 Build tokens · passed in 48s' }, { label: 'Files', value: '3 in extractions/' }, { label: 'Notified', value: 'Dev team, Design system' }],
      stats: [{ value: '8', label: 'Variables changed' }, { value: '6', label: 'Components impacted' }, { value: '1', label: 'Breaking' }, { value: '3', label: 'Brand modes' }],
      notice: { tone: 'error', title: '1 breaking change', body: 'surface/translucent was removed. Toggle used it and now has no fill — bind it to surface/overlay before the pull request merges.' },
      sections: [
        { kind: 'changes', title: 'Changelog', groups: [
          { change: 'added', rows: [{ name: 'feedback/info', valueKind: 'color', new: '#007BE5', scope: 'All brands', note: 'Used by Notice · Info tone' }, { name: 'space/inline-lg', valueKind: 'number', new: '12', scope: 'All brands', note: 'Not used by any component yet' }] },
          { change: 'modified', rows: [{ name: 'button/bg/primary', valueKind: 'color', old: '#0C8CE9', new: '#0978C8', scope: 'Bridge, Ikea', note: 'Used by Button, Date picker · white label now 4.6:1' }, { name: 'text/secondary', valueKind: 'color', old: '#A4A4A4', new: '#C4C4C4', scope: 'All brands', note: 'Used by Date picker, Dropdown' }, { name: 'radius/control', valueKind: 'number', old: '6', new: '8', scope: 'All brands', note: 'Used by Button, Tab, Dropdown' }] },
          { change: 'removed', rows: [{ name: 'surface/translucent', valueKind: 'color', old: '#FFFFFF1A', scope: 'All brands', note: 'Was used by Toggle · replace with surface/overlay', breaking: true }] },
        ] },
        { kind: 'items', title: 'Components impacted', rows: [{ title: 'Toggle', detail: 'surface/translucent removed · 4 variants', status: 'fail' }, { title: 'Button', detail: 'button/bg/primary · radius/control · 12 variants', status: 'warning' }, { title: 'Date picker', detail: 'button/bg/primary · text/secondary · 4 variants', status: 'warning' }] },
        { kind: 'code', title: 'Commit', language: 'Git', code: 'chore(tokens): button refresh (BB-342)\n\n8 variables changed: 2 added, 5 modified, 1 removed.\n6 components impacted, 1 with a breaking change.\n\n+ extractions/2026-11-12-0932.json\n~ extractions/latest.json\n~ extractions/index.json' },
      ],
      activity: [{ title: 'Extracted from Project Bluebird UI', detail: '1,031 variables · 140 components', time: '09:32' }, { title: 'Committed to develop', detail: 'extractions/2026-11-12-0932.json', time: '09:36' }, { title: 'Pull request #74 opened', detail: 'develop → main', time: '09:36' }, { title: 'Channels notified', detail: '#dev-design-handoff · #design-system-updates', time: '09:37' }],
    },
  },
  {
    id: 'cc1datepk', hoursAgo: 1.2, type: 'code-connect', status: 'done', title: 'Date picker', ticket: 'BB-351',
    summary: 'Code Connect template published · DatePicker.tsx · Bridge Components', by: { name: 'Ravi Kumar', team: 'Dev' }, file: 'Bridge Components', components: '1 component · 6 of 7 props mapped',
    details: {
      description: 'Date picker is now connected to src/components/DatePicker/DatePicker.tsx. 6 of 7 Figma properties map to props; Week start has no prop yet.',
      facts: [{ label: 'Figma component', value: 'Date picker · 4 variants' }, { label: 'Code file', value: 'src/components/DatePicker/DatePicker.tsx' }, { label: 'Repository', value: 'bridge-ui · main' }, { label: 'Published to', value: 'Dev Mode · Code Connect' }],
      stats: [{ value: '6', label: 'Props mapped' }, { value: '1', label: 'Unmapped' }, { value: '4', label: 'Variants' }],
      notice: { tone: 'info', title: '1 property is not mapped', body: 'Week start has no prop on DatePicker. Add weekStartsOn, or leave it out of the template.' },
      sections: [
        { kind: 'items', title: 'Property mapping', rows: [{ title: 'Range → range', detail: 'Variant → boolean', status: 'pass' }, { title: 'Size → size', detail: 'Variant → "sm" | "md" | "lg"', status: 'pass' }, { title: 'Week start', detail: 'Variant · no prop', status: 'warning' }] },
        { kind: 'code', title: 'Template', language: 'TypeScript', code: 'figma.connect(DatePicker, URL, {\n  props: { range: figma.boolean("Range"), size: figma.enum("Size", { Small: "sm", Medium: "md" }) },\n  example: (p) => <DatePicker {...p} />,\n})' },
      ],
      activity: [{ title: 'Template generated', detail: '7 properties read', time: '08:45' }, { title: 'Published to Dev Mode', detail: '1 file', time: '08:52' }],
    },
  },
  {
    id: 'mc1checko', hoursAgo: 1.9, type: 'mcp', status: 'done', title: 'Checkout screen', ticket: 'BB-339',
    summary: 'Screen generated and pushed through MCP · IKEA Web · PR #77', by: { name: 'Anita Rao', team: 'Product Design' }, file: 'IKEA Web', variables: '14 bound', components: '3 components',
    details: {
      description: 'The Checkout screen was turned into React through the Figma MCP server and pushed for review. 2 checks still need fixing in Figma.',
      facts: [{ label: 'Repository', value: 'ikea-web · feature/checkout-screen' }, { label: 'Pull request', value: '#77 · review requested' }, { label: 'Generated', value: 'React + Tailwind · 6 files' }],
      stats: [{ value: '14', label: 'Variable bindings' }, { value: '3', label: 'Components' }, { value: '2', label: 'Checks to fix' }],
      sections: [{ kind: 'items', title: 'Ready-for-code checks', rows: [{ title: 'Variables bound', detail: '14 of 14', status: 'pass' }, { title: 'Hard-coded values', detail: '2 colours in Promo banner', status: 'warning' }, { title: 'Alt text', detail: 'Product image has none', status: 'warning' }] }],
      activity: [{ title: 'Code generated through MCP', detail: '6 files', time: '08:10' }, { title: 'Pull request #77 opened', detail: 'ikea-web', time: '08:15' }],
    },
  },
  {
    id: 'ux1disabl', hoursAgo: 26, type: 'ux-ai', status: 'done', title: 'Disabled text token',
    summary: 'Asked “Which token for disabled text?” · Gap Storefront', by: { name: 'Meera Shah', team: 'Product Design' }, file: 'Gap Storefront', variables: '2 suggested · 1 applied',
    details: {
      facts: [{ label: 'Brand', value: 'Gap' }, { label: 'Sources', value: '3 · variables, docs, guidelines' }],
      stats: [{ value: '3', label: 'Sources' }, { value: '2', label: 'Tokens suggested' }],
      sections: [{ kind: 'messages', title: 'Conversation', rows: [{ role: 'user', text: 'Which token should I use for disabled text on the product page?' }, { role: 'assistant', text: 'Use text/disabled — #8A8A8A in Gap, 4.6:1 on surface/panel, the same token Button and Input use when disabled.' }] }],
    },
  },
  {
    id: 'rp2loginx', hoursAgo: 28, type: 'report', status: 'done', title: 'Login screen', ticket: 'BB-330',
    summary: 'Accessibility report · WCAG 2.2 AA · Project Bluebird UI', by: { name: 'Anita Rao', team: 'Product Design' }, file: 'Project Bluebird UI', components: '12 checked · 4 failing',
    details: {
      description: '4 issues need fixing — 1 critical and 3 serious — and 1 layer needs a manual check. 8 of 12 components pass.',
      stats: [{ value: '67%', label: 'Components passing' }, { value: '4', label: 'Issues to fix' }, { value: '1', label: 'Critical' }],
      sections: [{ kind: 'items', title: 'Issues', rows: [{ title: 'Caption text is 2.55:1', detail: 'WCAG 1.4.3 · needs 4.5:1', status: 'fail' }, { title: 'Close button is 16 × 16', detail: 'WCAG 2.5.8 · needs 24 × 24', status: 'warning' }] }],
    },
  },
  {
    id: 'ex2bridge', hoursAgo: 31, type: 'extraction', status: 'failed', title: 'Bridge components sync', ticket: 'BB-340',
    summary: 'Extraction not pushed · main is protected · Bridge Components', by: { name: 'Ravi Kumar', team: 'Dev' }, file: 'Bridge Components', variables: '3 modified · not pushed',
    details: { notice: { tone: 'error', title: 'The push was rejected', body: 'main only accepts pull requests. Nothing was pushed and nobody was notified.' } },
  },
  {
    id: 'cl1toggle', hoursAgo: 52,
    ...changelogEntry({ changes: SAMPLE_CHANGES.slice(0, 3), title: 'Toggle surface cleanup', notes: 'Toggle moves to surface/overlay; the translucent surface is gone.', ticket: 'BB-336', by: 'Meera Shah', team: 'Product Design', file: 'toggle-cleanup', main: 'Project Bluebird UI', page: 'Molecules', warnings: [], time: '10:05' }),
  },
  {
    id: 'ex3baseln', hoursAgo: 90, type: 'extraction', status: 'done', title: 'Baseline before the button refresh', ticket: 'BB-338',
    summary: 'Extraction pushed to main · PR #71 · Project Bluebird UI', by: { name: 'Praveen Manchi', team: 'Design System' }, file: 'Project Bluebird UI', variables: '1,026 variables · baseline', components: '139 components',
  },
]

export function sampleEntries(now: Date): HistoryEntry[] {
  return SEEDS.map(({ hoursAgo, ...e }) => ({ ...e, schema: 1, at: ago(now, hoursAgo) }))
}

export const SAMPLE_REPO = 'praveenmanchi/bridge-ds-tokens'
export const SAMPLE_JIRA = 'https://bluebird.atlassian.net'

/** Open tickets the mock's picker lists. */
export const SAMPLE_TICKETS: readonly TicketOption[] = [
  { key: 'BB-342', title: 'Darker primary button for AA contrast', status: 'In Progress' },
  { key: 'BB-351', title: 'Info colour for feedback banners', status: 'In Progress' },
  { key: 'BB-340', title: 'Filter chip for the PLP filters', status: 'To Do' },
]

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

/** The open file's versions, newest first. */
export const SAMPLE_VERSIONS = (now: Date): FileVersion[] => [
  { id: '6012', at: minutesAgo(now, 40), label: 'Button refresh ready for review', description: 'Primary button is darker so white labels pass AA; feedback/info added for banners.', by: 'Praveen Manchi' },
  { id: '6011', at: minutesAgo(now, 75), label: '', description: '', by: 'Ravi Kumar' },
  { id: '6010', at: minutesAgo(now, 120), label: '', description: '', by: 'Anita Rao' },
  { id: '6007', at: minutesAgo(now, 1500), label: 'Spacing scale v2', description: '', by: 'Anita Rao' },
  { id: '6004', at: minutesAgo(now, 1680), label: 'Filter chip first draft', description: '', by: 'Ravi Kumar' },
]

export const SAMPLE_VERSION_DIFF: VersionDiff = {
  changes: [
    { kind: 'added', what: 'Component set', name: 'Filter chip', detail: 'New component set on Molecules' },
    { kind: 'modified', what: 'Frame', name: 'Button · States', detail: 'Renamed from Button states on Atoms' },
    { kind: 'removed', what: 'Section', name: 'Old buttons', detail: 'Deleted section on Atoms' },
  ],
  note: 'Pages, the frames and sections on them, and components, compared with the version before. Edits inside a frame and variable values are not kept with Figma versions.',
}
