// Tab-local state. Nothing outside src/features/mcp reads or writes this.
import { computed, signal } from '@preact/signals'
import {
  FRAMEWORKS, PATHS, SCENARIOS, STYLINGS, SUGGESTED_ISSUE, shipSteps,
  type HandoffConnection, type HandoffIssue, type HandoffScenarioId, type IncludeOption, type ShipStepFixture,
} from './fixtures'

/** 0 Select · 1 Check · 2 Generate · 3 Ship (Figma "MCP flow v2" Stepper). */
export type FlowStep = 0 | 1 | 2 | 3
export type GenerationPhase = 'done' | 'failed'
export type ShipPhase = 'idle' | 'pushing' | 'pushed' | 'rejected'
export type AfterPushOption = 'openPr' | 'linkPr' | 'moveIssue'

const INCLUDE_ALL: Record<IncludeOption, boolean> = { codeConnect: true, story: true, test: true }
const AFTER_PUSH_ALL: Record<AfterPushOption, boolean> = { openPr: true, linkPr: true, moveIssue: true }

export const step = signal<FlowStep>(0)
export const scenarioId = signal<HandoffScenarioId>('ready')
/** false = nothing selected on the canvas (Figma "Empty · Nothing selected"). */
export const hasSelection = signal(true)
/** The issue the handoff references; "Link issue" fills it on the no-issue fixture. */
export const linkedIssue = signal<HandoffIssue | null>(SCENARIOS.ready.issue)
/** Fixture connections: off renders "MCP server not connected" / "GitHub not connected". */
export const mcpConnected = signal(true)
export const githubConnected = signal(true)
/** Connection ids switched to their alternate (e.g. the local Figma MCP server). */
export const alternateConnections = signal<readonly HandoffConnection['id'][]>([])

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
/** A failing check blocks Generate; warnings do not (Readiness Meter caption). */
export const blocked = computed(() => scenario.value.checks.some((c) => c.status === 'fail'))
export const failingChecks = computed(() => scenario.value.checks.filter((c) => c.status === 'fail').length)
/** The generated files the Include options keep: no story file without "Storybook story". */
export const files = computed(() => scenario.value.files.filter((f) => !f.requires || include.value[f.requires]))
export const steps = computed<readonly ShipStepFixture[]>(() => shipSteps({
  branch: branch.value,
  commit: commit.value,
  files: files.value.length,
  issueKey: linkedIssue.value?.key ?? null,
  ...afterPush.value,
}))
/** Ready to leave Select: MCP up, something selected, and a Jira issue to reference. */
export const canCheck = computed(() => mcpConnected.value && hasSelection.value && linkedIssue.value !== null)
export const canPush = computed(() => githubConnected.value && branch.value.trim() !== '' && commit.value.trim() !== '')

/** Switch the fixture selection and reload the fields that come from it. */
export function selectScenario(id: HandoffScenarioId): void {
  const s = SCENARIOS[id]
  scenarioId.value = id
  hasSelection.value = true
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
  hasSelection.value = false
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

/** Back to Select with the ship result cleared ("New handoff" / "Done"). */
export function startOver(): void {
  selectScenario(scenarioId.value)
}

export function reset(): void {
  selectScenario('ready')
  mcpConnected.value = true
  githubConnected.value = true
  alternateConnections.value = []
  framework.value = FRAMEWORKS[0]
  styling.value = STYLINGS[0]
  path.value = PATHS[0]
  include.value = INCLUDE_ALL
  afterPush.value = AFTER_PUSH_ALL
  rejectNextPush.value = false
}
