// Tab-local state. Nothing outside src/features/mcp reads or writes this.
//
// In Figma the selection, the checks and the GitHub connection arrive over the
// bridge (ui/Tab.tsx); stories and the mock load the same signals from a fixture
// scenario, which also supplies the Generate / Ship preview (files, branch, issue).
import { computed, signal } from '@preact/signals'
import {
  FILE_NAME, FRAMEWORKS, PATHS, SAMPLE_GITHUB, SCENARIOS, STYLINGS, SUGGESTED_ISSUE, shipSteps,
  type HandoffConnection, type HandoffIssue, type HandoffScenarioId, type IncludeOption, type ShipStepFixture,
} from './fixtures'
import type { CheckResult, GithubStatus, HandoffCheck, McpStatus, SelectionInfo, SelectionResult } from './messages'

/** 0 Select · 1 Check · 2 Generate · 3 Ship (Figma "MCP flow v2" Stepper). */
export type FlowStep = 0 | 1 | 2 | 3
export type LoadPhase = 'idle' | 'loading' | 'done' | 'failed'
export type GenerationPhase = 'done' | 'failed'
export type ShipPhase = 'idle' | 'pushing' | 'pushed' | 'rejected'
export type AfterPushOption = 'openPr' | 'linkPr' | 'moveIssue'

const INCLUDE_ALL: Record<IncludeOption, boolean> = { codeConnect: true, story: true, test: true }
const AFTER_PUSH_ALL: Record<AfterPushOption, boolean> = { openPr: true, linkPr: true, moveIssue: true }

export const step = signal<FlowStep>(0)
export const scenarioId = signal<HandoffScenarioId>('ready')

// ── Selection (mcp:selection) ─────────────────────────────────────────────────
/** null = nothing selected on the canvas (Figma "Empty · Nothing selected"). */
export const selection = signal<SelectionInfo | null>(SCENARIOS.ready.selection)
export const selectionPhase = signal<LoadPhase>('done')
export const selectionError = signal<string | null>(null)
/** Layers selected on the canvas; the handoff takes the first. */
export const selectionCount = signal(1)
export const fileName = signal(FILE_NAME)
/** figma.fileKey when the plugin has it; the prompt links the node with it. */
export const fileKey = signal<string | null>(null)

// ── Checks (mcp:check) ────────────────────────────────────────────────────────
export const checkResult = signal<CheckResult | null>({ nodeId: SCENARIOS.ready.selection.nodeId, readiness: SCENARIOS.ready.readiness, checks: SCENARIOS.ready.checks, stats: SCENARIOS.ready.stats })
export const checkPhase = signal<LoadPhase>('done')
export const checkError = signal<string | null>(null)

// ── Connections ───────────────────────────────────────────────────────────────
/** The issue the handoff references; "Link issue" fills it on the no-issue fixture. */
export const linkedIssue = signal<HandoffIssue | null>(SCENARIOS.ready.issue)
/** The MCP server is the developer's: the plugin can't probe it, so this is the designer's word (Figma "MCP server not connected"). */
export const mcpConnected = signal(true)
/** Settings › MCP + Code Sync (mcp:status). */
export const github = signal<GithubStatus>(SAMPLE_GITHUB)
/** Connection ids switched to their alternate (e.g. the local Figma MCP server). */
export const alternateConnections = signal<readonly HandoffConnection['id'][]>([])

// ── Generate / Ship (fixtures) ────────────────────────────────────────────────
export const framework = signal<string>(FRAMEWORKS[0])
export const styling = signal<string>(STYLINGS[0])
export const path = signal<string>(PATHS[0])
export const include = signal<Record<IncludeOption, boolean>>(INCLUDE_ALL)
export const activeFile = signal<string>('TicketRow.tsx')
/** Fixture outcome of the MCP generate call (Figma "Error · Generation failed"). */
export const generation = signal<GenerationPhase>('done')

export const branch = signal<string>(SCENARIOS.ready.branch)
export const commit = signal<string>(SCENARIOS.ready.commit)
export const afterPush = signal<Record<AfterPushOption, boolean>>(AFTER_PUSH_ALL)
export const shipPhase = signal<ShipPhase>('idle')
/** Index of the Ship step running now; steps before it are done. */
export const shipProgress = signal(0)
/** Fixture outcome: the next push is rejected because the branch moved on origin. */
export const rejectNextPush = signal(false)
/** One-line outcome of the last action (copied, opened, failed). */
export const notice = signal<string | null>(null)

export const scenario = computed(() => SCENARIOS[scenarioId.value])
export const hasSelection = computed(() => selection.value !== null)
export const githubConnected = computed(() => github.value.connected)
export const localMcp = computed(() => alternateConnections.value.includes('figma'))
/** The checks for the selected node; empty until mcp:check answers. */
export const checks = computed<readonly HandoffCheck[]>(() => checkResult.value?.nodeId === selection.value?.nodeId ? checkResult.value?.checks ?? [] : [])
/** A failing check blocks Generate; warnings do not (Readiness Meter caption). */
export const blocked = computed(() => checks.value.some((c) => c.status === 'fail'))
export const failingChecks = computed(() => checks.value.filter((c) => c.status === 'fail').length)
/** The generated files the Include options keep: no story file without "Storybook story". */
export const files = computed(() => scenario.value.files.filter((f) => !f.requires || include.value[f.requires]))
export const steps = computed<readonly ShipStepFixture[]>(() => shipSteps({
  repo: github.value.repo,
  branch: branch.value,
  commit: commit.value,
  files: files.value.length,
  issueKey: linkedIssue.value?.key ?? null,
  ...afterPush.value,
}))
/** Ready to leave Select: MCP up, something selected, and a Jira issue to reference. */
export const canCheck = computed(() => mcpConnected.value && hasSelection.value && linkedIssue.value !== null)
export const canPush = computed(() => githubConnected.value && branch.value.trim() !== '' && commit.value.trim() !== '')

/** What mcp:selection answered. A different node drops the checks and, mid-flow, returns to Select. */
export function applySelection(result: SelectionResult): void {
  const changed = result.selected?.nodeId !== selection.value?.nodeId
  selection.value = result.selected
  selectionCount.value = result.count
  fileName.value = result.fileName
  fileKey.value = result.fileKey
  selectionPhase.value = 'done'
  selectionError.value = null
  if (!changed) return
  checkResult.value = null
  checkPhase.value = 'idle'
  checkError.value = null
  if (step.value > 0 && shipPhase.value !== 'pushing' && shipPhase.value !== 'pushed') {
    step.value = 0
    notice.value = result.selected ? `Selection changed to ${result.selected.frame} — starting again from Select.` : 'Nothing is selected any more — starting again from Select.'
  }
}

export function applyStatus(result: McpStatus): void {
  github.value = result.github
}

/** Switch the fixture selection and reload the fields that come from it. */
export function selectScenario(id: HandoffScenarioId): void {
  const s = SCENARIOS[id]
  scenarioId.value = id
  selection.value = s.selection
  selectionPhase.value = 'done'
  selectionError.value = null
  selectionCount.value = 1
  checkResult.value = { nodeId: s.selection.nodeId, readiness: s.readiness, checks: s.checks, stats: s.stats }
  checkPhase.value = 'done'
  checkError.value = null
  linkedIssue.value = s.issue
  branch.value = s.branch
  commit.value = s.commit
  activeFile.value = s.files[0]!.name
  generation.value = 'done'
  shipPhase.value = 'idle'
  shipProgress.value = 0
  notice.value = null
  step.value = 0
}

export function clearSelection(): void {
  selection.value = null
  selectionCount.value = 0
  checkResult.value = null
  checkPhase.value = 'idle'
  step.value = 0
  notice.value = null
}

export function linkIssue(): void {
  linkedIssue.value = SUGGESTED_ISSUE
  branch.value = SCENARIOS.ready.branch
  commit.value = SCENARIOS.ready.commit
}

export function goTo(next: FlowStep): void {
  step.value = next
  notice.value = null
}

/** Back to Select with the ship result cleared ("New handoff" / "Done"). Keeps the live selection, checks and connection. */
export function startOver(): void {
  const s = scenario.value
  branch.value = s.branch
  commit.value = s.commit
  activeFile.value = s.files[0]!.name
  generation.value = 'done'
  shipPhase.value = 'idle'
  shipProgress.value = 0
  notice.value = null
  step.value = 0
}

export function reset(): void {
  selectScenario('ready')
  fileName.value = FILE_NAME
  fileKey.value = null
  mcpConnected.value = true
  github.value = SAMPLE_GITHUB
  alternateConnections.value = []
  framework.value = FRAMEWORKS[0]
  styling.value = STYLINGS[0]
  path.value = PATHS[0]
  include.value = INCLUDE_ALL
  afterPush.value = AFTER_PUSH_ALL
  rejectNextPush.value = false
}
