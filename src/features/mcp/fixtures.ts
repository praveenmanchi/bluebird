// Sample data copied from the Figma "MCP flow v2 · 600" screens (happy path
// 40000496:6690, empty states 40000497:7749, error states 40000497:8630), so the
// default render reads like the design. Everything here is fixture data: no MCP
// server, Jira or GitHub is contacted yet.
import type {
  CheckItemStatus, ConnectionRowStatus, IssueTypeKind, MetaBadgeTone, Priority, ReadinessMeterTone,
} from '@shared/ui'

export type HandoffScenarioId = 'ready' | 'not-ready' | 'no-issue'

export interface HandoffConnection {
  id: 'figma' | 'github'
  name: string
  detail: string
  actionLabel: string
  status: ConnectionRowStatus
  /** The alternative the action switches to (e.g. the local Figma MCP server). */
  alternate?: { detail: string; actionLabel: string }
}

export interface HandoffSelection {
  /** Figma node id of the selected frame ("Open in Figma" focuses it). */
  nodeId: string
  frame: string
  path: string
}

export interface HandoffIssue {
  key: string
  title: string
  issueType: IssueTypeKind
  status: string
  statusTone: MetaBadgeTone
  priority: Priority
  points: string
  assignee: string
  assigneeName: string
}

export interface HandoffCheck {
  id: string
  status: CheckItemStatus
  title: string
  detail: string
  actionLabel?: string
}

export interface GeneratedFile {
  name: string
  /** CodeSnippet "Language" caption. */
  caption: string
  code: string
  /** Ship "Files to push" row detail. */
  detail: string
  /** Only produced when this Include option is checked. */
  requires?: IncludeOption
}

export type IncludeOption = 'codeConnect' | 'story' | 'test'

export interface HandoffScenario {
  id: HandoffScenarioId
  selection: HandoffSelection
  issue: HandoffIssue | null
  readiness: { tone: ReadinessMeterTone; value: number }
  checks: readonly HandoffCheck[]
  files: readonly GeneratedFile[]
  summary: string
  branch: string
  commit: string
}

export const STEPS = [{ label: 'Select' }, { label: 'Check' }, { label: 'Generate' }, { label: 'Ship' }] as const

export const CONNECTIONS: readonly HandoffConnection[] = [
  {
    id: 'figma', name: 'Figma MCP server', detail: 'Remote · mcp.figma.com/mcp', actionLabel: 'Use local', status: 'good',
    alternate: { detail: 'Local · 127.0.0.1:3845/mcp', actionLabel: 'Use remote' },
  },
  { id: 'github', name: 'GitHub', detail: 'praveenmanchi/bluebird · base main', actionLabel: 'Change', status: 'good' },
]

export const FRAMEWORKS = ['Preact + TypeScript', 'React + TypeScript', 'Web components'] as const
export const STYLINGS = ['CSS variables (--bb-*)', 'CSS modules', 'Tailwind'] as const
export const PATHS = ['src/shared/ui/TicketRow', 'src/features/jira/ui', 'src/components'] as const

export const INCLUDE_LABELS: Record<IncludeOption, string> = {
  codeConnect: 'Use Code Connect mappings',
  story: 'Storybook story',
  test: 'Vitest test',
}

/** Figma Code Snippet "Code" on the TicketRow.tsx tab (both screens). */
const TICKET_ROW_TSX = `import { IssueType, PriorityIcon, StoryPoints, Avatar } from '@/shared/ui/jira';
import { MetaBadge } from '@/shared/ui/MetaBadge';
import './TicketRow.css';

export function TicketRow({ issue, state = 'default' }: TicketRowProps) {
  return (
    <li className="ticket-row" data-state={state}>
      <IssueType type={issue.type} />
      <span className="ticket-row__key">{issue.key}</span>
      <MetaBadge tone={toneFor(issue.status)} label={issue.status} />
      <PriorityIcon priority={issue.priority} />
      <StoryPoints points={issue.points} />
      <Avatar initials={issue.assignee.initials} size="small" />
      <p className="ticket-row__title">{issue.summary}</p>
    </li>
  );
}`

// Figma only draws the .tsx tab's contents; the other two are representative fixtures.
const TICKET_ROW_CSS = `.ticket-row {
  display: flex;
  flex-direction: column;
  gap: var(--bb-jira-space-tight);
  padding: var(--bb-jira-space-row-y) var(--bb-jira-space-row-x);
  border-radius: var(--bb-jira-radius-row);
}
.ticket-row[data-state='selected'] {
  background: var(--bb-jira-row-bg-selected);
}
.ticket-row__key {
  color: var(--bb-jira-text-key);
  font-size: var(--bb-jira-font-size-caption);
}
.ticket-row__title {
  margin: 0;
  color: var(--bb-jira-text-title);
  font-size: var(--bb-jira-font-size-body);
}`

const TICKET_ROW_STORIES = `import type { Meta, StoryObj } from '@storybook/preact-vite';
import { TicketRow } from './TicketRow';

const meta = { title: 'Jira/Ticket Row', component: TicketRow } satisfies Meta<typeof TicketRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { state: 'default' } };
export const Hover: Story = { args: { state: 'hover' } };
export const Selected: Story = { args: { state: 'selected' } };`

// Figma copy says "var" + "(--bb-jira-*)"; the \x28 escape keeps tokens:check from reading it as a CSS var read.
const JIRA_VARS = 'var\x28--bb-jira-*)'

function files(tsxCaption: string): readonly GeneratedFile[] {
  return [
    { name: 'TicketRow.tsx', caption: tsxCaption, code: TICKET_ROW_TSX, detail: 'New · 62 lines · uses MetaBadge, PriorityIcon, Avatar' },
    { name: 'TicketRow.css', caption: tsxCaption.replace(/^TSX/, 'CSS'), code: TICKET_ROW_CSS, detail: `New · 41 lines · 21 ${JIRA_VARS} tokens` },
    { name: 'TicketRow.stories.tsx', caption: tsxCaption, code: TICKET_ROW_STORIES, detail: 'New · 15 lines · Default, Hover, Selected', requires: 'story' },
  ]
}

export const BB_142: HandoffIssue = {
  key: 'BB-142', title: 'Jira tab: ticket list and detail view in Brand UI', issueType: 'story',
  status: 'IN PROGRESS', statusTone: 'accent', priority: 'high', points: '5', assignee: 'PM', assigneeName: 'Praveen Manchi',
}

const TICKET_ROW: HandoffSelection = { nodeId: '40000267:8004', frame: 'Ticket Row', path: 'Plugin UI › Components › Jira · 3 variants' }

const READY_CHECKS: readonly HandoffCheck[] = [
  { id: 'components', status: 'pass', title: 'Components', detail: '14 of 14 instances come from the library' },
  { id: 'code-connect', status: 'warning', title: 'Code Connect', detail: '2 components have no code mapping: Issue Type, Priority Icon', actionLabel: 'Map' },
  { id: 'variables', status: 'warning', title: 'Variables', detail: '98% bound to Brand UI · 1 gap (6px) is off the spacing scale', actionLabel: 'Fix' },
  { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'Every frame uses auto layout' },
  { id: 'jira', status: 'pass', title: 'Jira link', detail: 'BB-142 · In progress · assigned to you' },
]

const READY: HandoffScenario = {
  id: 'ready',
  selection: TICKET_ROW,
  issue: BB_142,
  readiness: { tone: 'success', value: 92 },
  checks: READY_CHECKS,
  files: files('TSX · generated from Ticket Row'),
  summary: `Reuses 5 existing components · 21 tokens as ${JIRA_VARS} · 0 hardcoded values · 3 files`,
  branch: 'feat/BB-142-ticket-row',
  commit: 'feat(jira): add Ticket Row (BB-142)',
}

export const SCENARIOS: Record<HandoffScenarioId, HandoffScenario> = {
  /** Figma "MCP v2 · 1 Select" … "6 Ship · PR link". */
  ready: READY,
  /** Figma "MCP v2 · Error · Not ready": two failing checks lock Generate. */
  'not-ready': {
    ...READY,
    id: 'not-ready',
    readiness: { tone: 'danger', value: 58 },
    checks: [
      { id: 'components', status: 'fail', title: 'Components', detail: '2 detached instances: Button, Dropdown', actionLabel: 'Reattach' },
      { id: 'code-connect', status: 'warning', title: 'Code Connect', detail: '2 components have no code mapping: Issue Type, Priority Icon', actionLabel: 'Map' },
      { id: 'variables', status: 'fail', title: 'Variables', detail: '14 raw colours and 3 off-scale gaps are not bound to Brand UI', actionLabel: 'Fix all' },
      { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'Every frame uses auto layout' },
      { id: 'jira', status: 'pass', title: 'Jira link', detail: 'BB-142 · In progress · assigned to you' },
    ],
    files: files('TSX · preview only'),
    summary: 'Preview contains 17 hardcoded values. They would ship as --bb-derived-* tokens until they are bound in Figma.',
  },
  /** Figma "MCP v2 · Empty · No Jira issue": the selection is fine but nothing links it to Jira. */
  'no-issue': { ...READY, id: 'no-issue', issue: null, branch: 'feat/ticket-row', commit: 'feat(jira): add Ticket Row' },
}

/** What "Link issue" attaches in the fixture (the issue the ready selection carries). */
export const SUGGESTED_ISSUE = BB_142

/** Figma "Ship steps" rows, in order; the Jira rows only run when an issue is linked and the option is on. */
export type ShipStepId = 'commit' | 'push' | 'openPr' | 'linkPr' | 'moveIssue'

export interface ShipStepFixture { id: ShipStepId; title: string; detail: string; time: string }

export interface PullRequest { number: number; url: string; additions: number }

export const PULL_REQUEST: PullRequest = { number: 63, url: 'https://github.com/praveenmanchi/bluebird/pull/63', additions: 118 }
export const REPO = 'praveenmanchi/bluebird'
export const REVIEWER = '@anita'
/** Settings › Integrations placeholder site; the real one comes from the Jira integration later. */
export const JIRA_SITE = 'https://yourteam.atlassian.net'
export const issueUrl = (key: string): string => `${JIRA_SITE}/browse/${encodeURIComponent(key)}`

/** One row per step that will run for this push, with Figma's sample timings. */
export function shipSteps(o: { branch: string; commit: string; files: number; issueKey: string | null; openPr: boolean; linkPr: boolean; moveIssue: boolean }): readonly ShipStepFixture[] {
  const steps: ShipStepFixture[] = [
    { id: 'commit', title: `Commit ${o.files} ${o.files === 1 ? 'file' : 'files'}`, detail: `${o.branch} · ${o.commit}`, time: '1s' },
    { id: 'push', title: 'Push branch', detail: `${REPO} · origin/${o.branch}`, time: '2s' },
  ]
  if (o.openPr) steps.push({ id: 'openPr', title: 'Open pull request', detail: `base main · reviewer ${REVIEWER}`, time: '4s' })
  if (o.issueKey && o.linkPr && o.openPr) steps.push({ id: 'linkPr', title: `Link PR to ${o.issueKey}`, detail: 'Jira comment + development panel', time: '1s' })
  if (o.issueKey && o.moveIssue) steps.push({ id: 'moveIssue', title: `Move ${o.issueKey} to In review`, detail: 'Jira workflow transition', time: '1s' })
  return steps
}

/** Figma "MCP log" on "Generation failed". */
export const GENERATION_LOG = `→ get_design_context  node 40000267:8004  (Ticket Row)
→ get_code_connect_map  3 mappings
→ generate  preact-ts  css-vars
✕ timeout after 60000 ms  (mcp.figma.com/mcp)
  request id 7f3c-91a2 · retry is safe`

/** Figma "Git output" on "Push rejected". */
export function rejectedLog(branch: string): string {
  return `$ git push origin ${branch}
 ! [rejected]  ${branch} -> ${branch} (fetch first)
error: failed to push some refs to github.com/${REPO}`
}

/** A failing check blocks the push; warnings do not (Readiness Meter caption). */
export function isBlocked(scenario: HandoffScenario): boolean {
  return scenario.checks.some((c) => c.status === 'fail')
}

export interface PromptOptions {
  framework: string
  styling: string
  path: string
  include: Record<IncludeOption, boolean>
  issue: HandoffIssue | null
  branch: string
  commit: string
}

/** The prompt "Copy prompt for Claude Code" puts on the clipboard. */
export function buildPrompt(s: HandoffScenario, o: PromptOptions): string {
  const include = (Object.keys(o.include) as IncludeOption[]).filter((k) => o.include[k]).map((k) => INCLUDE_LABELS[k])
  return [
    `Implement the Figma frame "${s.selection.frame}" (${s.selection.path}, node ${s.selection.nodeId}) using the Figma MCP server.`,
    `Framework: ${o.framework}. Styling: ${o.styling}. Write to ${o.path}.`,
    include.length ? `Include: ${include.join(', ')}.` : '',
    o.issue ? `Jira: ${o.issue.key} — ${o.issue.title}.` : 'No Jira issue is linked.',
    `Branch: ${o.branch}. Commit: ${o.commit}.`,
  ].filter(Boolean).join('\n')
}
