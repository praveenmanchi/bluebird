// Sample data copied from the Figma "MCP flow v2 · 600" screens (happy path
// 40000496:6690, empty states 40000497:7749, error states 40000497:8630), so the
// default render reads like the design. In Figma the selection, the readiness
// checks and the GitHub connection are real (sandbox/); the scenarios here feed
// the mock, the stories and the Generate / Ship preview, which still run on
// fixtures. Everything the tab hands to a developer — the prompt and the MCP
// setup — is built from the real selection.
import type { ConnectionRowStatus, IssueTypeKind, MetaBadgeTone, Priority, ReadinessMeterTone } from '@shared/ui'
import type { CheckStats, GithubStatus, HandoffCheck, SelectionInfo } from './messages'

export type HandoffScenarioId = 'ready' | 'not-ready' | 'no-issue'

export interface HandoffConnection {
  id: 'figma'
  name: string
  detail: string
  actionLabel: string
  status: ConnectionRowStatus
  /** The alternative the action switches to (e.g. the local Figma MCP server). */
  alternate: { detail: string; actionLabel: string }
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
  selection: SelectionInfo
  issue: HandoffIssue | null
  readiness: { tone: ReadinessMeterTone; value: number }
  checks: readonly HandoffCheck[]
  stats: CheckStats
  files: readonly GeneratedFile[]
  summary: string
  branch: string
  commit: string
}

export const STEPS = [{ label: 'Select' }, { label: 'Check' }, { label: 'Generate' }, { label: 'Ship' }] as const

/** The Figma MCP server endpoints Claude Code and Cursor connect to. */
export const MCP_REMOTE_URL = 'https://mcp.figma.com/mcp'
export const MCP_LOCAL_URL = 'http://127.0.0.1:3845/mcp'

export const CONNECTIONS: readonly HandoffConnection[] = [
  {
    id: 'figma', name: 'Figma MCP server', detail: 'Remote · mcp.figma.com/mcp', actionLabel: 'Use local', status: 'good',
    alternate: { detail: 'Local · 127.0.0.1:3845/mcp', actionLabel: 'Use remote' },
  },
]

/** Settings › MCP + Code Sync as the fixtures assume it. */
export const SAMPLE_GITHUB: GithubStatus = { connected: true, repo: 'praveenmanchi/bluebird', branch: 'main' }
export const NO_GITHUB: GithubStatus = { connected: false, repo: '', branch: 'main', problem: 'Add the repository and personal access token in Settings › MCP + code sync' }

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

/** Figma "Ticket Row" component set: what mcp:selection answers in the mock. */
export const TICKET_ROW: SelectionInfo = {
  nodeId: '40000267:8004', frame: 'Ticket Row', path: 'Plugin UI › Components › Jira · 3 variants', type: 'COMPONENT_SET', variants: 3, layers: 42,
  description: 'One issue in the Jira tab’s ticket list: type, key, status, priority, points, assignee and summary.',
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

const READY: HandoffScenario = {
  id: 'ready',
  selection: TICKET_ROW,
  issue: BB_142,
  readiness: { tone: 'success', value: 84 },
  checks: READY_CHECKS,
  stats: READY_STATS,
  files: files('TSX · generated from Ticket Row'),
  summary: `Reuses 14 library components · 49 tokens as ${JIRA_VARS} · 1 hardcoded value · 3 files`,
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
export const REVIEWER = '@anita'
/** Settings › Integrations placeholder site; the real one comes from the Jira integration later. */
export const JIRA_SITE = 'https://yourteam.atlassian.net'
export const issueUrl = (key: string): string => `${JIRA_SITE}/browse/${encodeURIComponent(key)}`

/** One row per step that will run for this push, with Figma's sample timings. */
export function shipSteps(o: { repo: string; branch: string; commit: string; files: number; issueKey: string | null; openPr: boolean; linkPr: boolean; moveIssue: boolean }): readonly ShipStepFixture[] {
  const steps: ShipStepFixture[] = [
    { id: 'commit', title: `Commit ${o.files} ${o.files === 1 ? 'file' : 'files'}`, detail: `${o.branch} · ${o.commit}`, time: '1s' },
    { id: 'push', title: 'Push branch', detail: `${o.repo} · origin/${o.branch}`, time: '2s' },
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
export function rejectedLog(repo: string, branch: string): string {
  return `$ git push origin ${branch}
 ! [rejected]  ${branch} -> ${branch} (fetch first)
error: failed to push some refs to github.com/${repo}`
}

/** The Figma URL of a node, when the plugin knows the file key (private plugins only). */
export function nodeUrl(fileKey: string | null, nodeId: string): string | null {
  return fileKey ? `https://www.figma.com/design/${encodeURIComponent(fileKey)}?node-id=${encodeURIComponent(nodeId.replace(':', '-'))}` : null
}

/** How Claude Code registers the Figma MCP server the Connections card points at. */
export function mcpSetup(local: boolean): string {
  const url = local ? MCP_LOCAL_URL : MCP_REMOTE_URL
  return [
    local
      ? '# Figma desktop MCP server: Figma › Preferences › Enable local MCP server, then:'
      : '# Figma remote MCP server (signs in with your Figma account on first use):',
    `claude mcp add --transport http figma ${url}`,
    '',
    '# Cursor / other MCP clients: add to mcp.json',
    JSON.stringify({ mcpServers: { figma: { type: 'http', url } } }, null, 2),
  ].join('\n')
}

export interface PromptInput {
  selection: SelectionInfo
  fileName: string
  fileKey: string | null
  checks: readonly HandoffCheck[]
  framework: string
  styling: string
  path: string
  include: Record<IncludeOption, boolean>
  issue: HandoffIssue | null
  branch: string
  commit: string
}

/** The prompt "Copy prompt for Claude Code" puts on the clipboard: the real selection, where to read it, and what the checks found. */
export function buildPrompt(o: PromptInput): string {
  const s = o.selection
  const url = nodeUrl(o.fileKey, s.nodeId)
  const include = (Object.keys(o.include) as IncludeOption[]).filter((k) => o.include[k]).map((k) => INCLUDE_LABELS[k])
  const gaps = o.checks.filter((c) => c.status !== 'pass').map((c) => `- ${c.title}: ${c.detail}`)
  const kind = s.type === 'COMPONENT_SET' ? 'component set' : s.type === 'COMPONENT' ? 'component' : s.type === 'INSTANCE' ? 'instance' : 'frame'
  return [
    `Implement the Figma ${kind} "${s.frame}" (${s.path}) using the Figma MCP server.`,
    url ? `Read it with get_design_context on ${url} (node ${s.nodeId}).` : `Read it with get_design_context: node ${s.nodeId} in the file "${o.fileName}" (select it in Figma for the desktop server).`,
    s.description ? `Description: ${s.description}` : '',
    `Framework: ${o.framework}. Styling: ${o.styling}. Write to ${o.path}.`,
    include.length ? `Include: ${include.join(', ')}.` : '',
    'Reuse the existing design-system components and tokens; never hardcode a value that has a variable.',
    gaps.length ? `Known gaps in the design (keep them visible as TODOs, do not paper over them):\n${gaps.join('\n')}` : 'The readiness checks passed: every value is bound and every instance comes from the library.',
    o.issue ? `Jira: ${o.issue.key} — ${o.issue.title}.` : 'No Jira issue is linked.',
    `Branch: ${o.branch}. Commit: ${o.commit}.`,
  ].filter(Boolean).join('\n')
}
