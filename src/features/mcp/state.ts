// Tab-local state. Nothing outside src/features/mcp reads or writes this.
//
// In Figma the selection, the checks, each scenario's repository and the pull-request
// lookup arrive over the bridge (ui/Tab.tsx); stories and the mock load the same signals
// from a fixture scenario.
import { computed, signal } from '@preact/signals'
import type { McpScenario } from '@shared/integrations'
import { FILE_NAME, SAMPLE_IMPACT, SAMPLE_RELEASES, SAMPLE_TARGETS, SCENARIOS, type HandoffConnection, type HandoffScenarioId } from './fixtures'
import { buildLibraryPrompt, libraryBranch, perScreen, screenBranches, type LibraryPromptInput } from './library'
import { BRANCH_NAME, type CheckResult, type HandoffCheck, type ImpactResult, type LibraryRelease, type McpStatus, type SelectionInfo, type SelectionResult, type TargetStatus, type TrackResult, type UsedComponent } from './messages'
import { ISSUE_KEY, STYLINGS, buildPrompt, suggestBranch, type HandoffMode, type IncludeOption, type PromptInput, type SelectionScenario } from './prompt'

/** 0 Select · 1 Check · 2 Hand off · 3 Track (Figma "MCP flow v3" Stepper). */
export type FlowStep = 0 | 1 | 2 | 3
export type LoadPhase = 'idle' | 'loading' | 'done' | 'failed'
/** `checking`: asking GitHub now. `waiting`: asked, no pull request yet. */
export type TrackPhase = 'idle' | 'checking' | 'waiting' | 'found' | 'failed'
/** What the Hand off step's snippet shows. */
export type HandoffView = 'prompt' | 'setup' | 'outputs'

const INCLUDE_ALL: Record<IncludeOption, boolean> = { codeConnect: true, story: true, test: true }
const result = (id: HandoffScenarioId): CheckResult => {
  const s = SCENARIOS[id]
  return { nodeId: s.selection.nodeId, readiness: s.readiness, checks: s.checks, stats: s.stats, components: s.components }
}

export const step = signal<FlowStep>(0)
/** The fixture the mock and the stories load. */
export const scenarioId = signal<HandoffScenarioId>('ready')
/** Which scenario this hand-off is. It follows the selection; a pick on the switch lasts until the selection changes. */
export const kind = signal<McpScenario>('component')

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
export const checkResult = signal<CheckResult | null>(result('ready'))
export const checkPhase = signal<LoadPhase>('done')
export const checkError = signal<string | null>(null)

// ── Connections ───────────────────────────────────────────────────────────────
/** The MCP server is the developer's: the plugin can't probe it, so this is the designer's word (Figma "MCP server not connected"). */
export const mcpConnected = signal(true)
/** Settings › MCP + code sync (mcp:status): one repository per scenario. */
export const targets = signal<Record<McpScenario, TargetStatus>>(SAMPLE_TARGETS)
/** Connection ids switched to their alternate (e.g. the local Figma MCP server). */
export const alternateConnections = signal<readonly HandoffConnection['id'][]>([])

// ── Hand off ──────────────────────────────────────────────────────────────────
/** The Jira issue the branch and the pull request reference; '' = none. */
export const issueKey = signal('')
export const mode = signal<HandoffMode>('build')
export const styling = signal<string>(STYLINGS[0])
export const include = signal<Record<IncludeOption, boolean>>(INCLUDE_ALL)
export const view = signal<HandoffView>('prompt')
/** The branch as the person typed it; null = the suggested one. */
export const branchOverride = signal<string | null>(null)

// ── Track (mcp:track) ─────────────────────────────────────────────────────────
/** When the prompt was last copied ("14:02"); null = not yet. */
export const copiedAt = signal<string | null>(null)
export const trackPhase = signal<TrackPhase>('idle')
export const trackResult = signal<TrackResult | null>(null)
export const trackError = signal<string | null>(null)
/** Bumped whenever the tracked hand-off changes, so an answer to an earlier question is dropped. */
export const trackEpoch = signal(0)
/** A canvas selection that arrived while a hand-off was being tracked; applied when Track is left. */
const pendingSelection = signal<SelectionResult | null>(null)

// ── Library update (mcp:releases, mcp:impact) ────────────────────────────────
export const releases = signal<readonly LibraryRelease[]>(SAMPLE_RELEASES)
export const releasesPhase = signal<LoadPhase>('done')
/** Why no releases can be listed (Storage not set up), or the load error. */
export const releasesProblem = signal<string | null>(null)
export const releaseId = signal<string | null>(SAMPLE_RELEASES[0]?.id ?? null)
export const impactResult = signal<ImpactResult | null>(SAMPLE_IMPACT)
export const impactPhase = signal<LoadPhase>('done')
export const impactError = signal<string | null>(null)
/** Screens the designer left out of this update. */
export const leftOut = signal<readonly string[]>([])

/** One-line outcome of the last action (copied, opened, failed). */
export const notice = signal<string | null>(null)

export const scenario = computed(() => SCENARIOS[scenarioId.value])
export const hasSelection = computed(() => selection.value !== null)
export const localMcp = computed(() => alternateConnections.value.includes('figma'))
/** The repository of the scenario in hand. */
export const target = computed<TargetStatus>(() => targets.value[kind.value])
const checked = computed(() => (checkResult.value?.nodeId === selection.value?.nodeId ? checkResult.value : null))
/** The checks for the selected node; empty until mcp:check answers. */
export const checks = computed<readonly HandoffCheck[]>(() => checked.value?.checks ?? [])
/** The components the selected node is built from. */
export const components = computed<readonly UsedComponent[]>(() => checked.value?.components ?? [])
/** A failing check blocks Hand off; warnings do not (Readiness Meter caption). */
export const blocked = computed(() => checks.value.some((c) => c.status === 'fail'))
export const failingChecks = computed(() => checks.value.filter((c) => c.status === 'fail').length)
export const issueError = computed(() => (issueKey.value.trim() && !ISSUE_KEY.test(issueKey.value.trim()) ? 'Use the issue key, e.g. BB-142' : null))
export const release = computed<LibraryRelease | null>(() => releases.value.find((r) => r.id === releaseId.value) ?? null)
/** The screens the update covers: what the scan found, minus the ones left out. */
export const chosenScreens = computed(() => (impactResult.value?.screens ?? []).filter((s) => !leftOut.value.includes(s.nodeId)))
const typedIssue = computed(() => (ISSUE_KEY.test(issueKey.value.trim()) ? issueKey.value.trim() : ''))
export const branch = computed(() => {
  if (branchOverride.value !== null) return branchOverride.value
  if (kind.value === 'library') return release.value ? libraryBranch(release.value, typedIssue.value) : 'chore/library-update'
  return suggestBranch({ frame: selection.value?.frame ?? '', issueKey: issueKey.value.trim(), mode: mode.value })
})
/** One branch per screen when Settings asks for one pull request per screen; null otherwise. */
export const trackedBranches = computed<readonly string[] | null>(() => {
  if (kind.value !== 'library' || !perScreen(target.value)) return null
  return screenBranches(branch.value.trim(), chosenScreens.value.slice(0, 20))
})
export const branchError = computed(() => (BRANCH_NAME.test(branch.value.trim()) ? null : 'Use a branch name without spaces, e.g. feat/BB-142-ticket-row'))
/** Ready to leave Select: MCP up, the scenario's repository connected, something selected and no half-typed issue key. */
export const canCheck = computed(() => mcpConnected.value && kind.value !== 'library' && target.value.connected && hasSelection.value && issueError.value === null)

/** Everything the prompt is built from; null without a selection or in the library scenario. */
export const promptInput = computed<PromptInput | null>(() => {
  const s = selection.value
  if (!s || kind.value === 'library') return null
  return {
    kind: kind.value as SelectionScenario, mode: mode.value, selection: s, fileName: fileName.value, fileKey: fileKey.value,
    checks: checks.value, components: components.value, target: target.value, styling: styling.value, include: include.value,
    issueKey: issueError.value ? '' : issueKey.value.trim(), branch: branch.value.trim(),
  }
})
export const libraryInput = computed<LibraryPromptInput | null>(() => {
  const r = release.value
  if (kind.value !== 'library' || !r || !chosenScreens.value.length) return null
  return { release: r, screens: chosenScreens.value, target: target.value, fileName: fileName.value, fileKey: fileKey.value, issueKey: typedIssue.value, branch: branch.value.trim() }
})
/** The Claude Code prompt for the hand-off in hand. */
export const prompt = computed(() => {
  if (kind.value === 'library') return libraryInput.value ? buildLibraryPrompt(libraryInput.value) : null
  return promptInput.value ? buildPrompt(promptInput.value) : null
})

/** A component or a component set is the Component scenario; any other layer is a screen. */
export const detectKind = (type: string): SelectionScenario => (type === 'COMPONENT' || type === 'COMPONENT_SET' ? 'component' : 'screen')

function clearTrack(): void {
  trackEpoch.value += 1
  copiedAt.value = null
  trackPhase.value = 'idle'
  trackResult.value = null
  trackError.value = null
}

/** What mcp:selection answered. A different node drops the checks and, before the hand-off went out, returns to Select. */
export function applySelection(next: SelectionResult): void {
  const changed = next.selected?.nodeId !== selection.value?.nodeId
  // Track watches a hand-off that already left: the prompt, the branch and the repository stay
  // those of the selection it was made from. The new selection waits until Track is left.
  if (step.value === 3 && changed) { pendingSelection.value = next; return }
  selection.value = next.selected
  selectionCount.value = next.count
  fileName.value = next.fileName
  fileKey.value = next.fileKey
  selectionPhase.value = 'done'
  selectionError.value = null
  if (!changed) return
  // A library update starts from a release, not the selection: "Show in Figma" on a screen
  // selects it, and that must not send the designer back to the first step.
  if (kind.value === 'library') return
  checkResult.value = null
  checkPhase.value = 'idle'
  checkError.value = null
  branchOverride.value = null
  if (next.selected) kind.value = detectKind(next.selected.type)
  if (step.value > 0) {
    step.value = 0
    notice.value = next.selected ? `Selection changed to ${next.selected.frame} — starting again from Select.` : 'Nothing is selected any more — starting again from Select.'
  }
}

/** Leaving Track: pick up the selection the canvas moved to meanwhile. */
function applyPending(): void {
  const waiting = pendingSelection.value
  pendingSelection.value = null
  if (waiting) applySelection(waiting)
}

export function applyStatus(next: McpStatus): void {
  targets.value = next.targets
}

/** Pick a release on the Changes step: the impact is found again and the branch follows the release. */
export function selectRelease(id: string): void {
  releaseId.value = id
  impactResult.value = null
  impactPhase.value = 'idle'
  impactError.value = null
  leftOut.value = []
  branchOverride.value = null
}

export function toggleScreen(nodeId: string): void {
  leftOut.value = leftOut.value.includes(nodeId) ? leftOut.value.filter((id) => id !== nodeId) : [...leftOut.value, nodeId]
}

/** Pick the scenario by hand (the switch on Select). */
export function setKind(next: McpScenario): void {
  kind.value = next
  branchOverride.value = null
  clearTrack()
  step.value = 0
  notice.value = null
  applyPending()
}

/** Switch the fixture selection and reload the fields that come from it. */
export function selectScenario(id: HandoffScenarioId): void {
  const s = SCENARIOS[id]
  scenarioId.value = id
  selection.value = s.selection
  selectionPhase.value = 'done'
  selectionError.value = null
  selectionCount.value = 1
  checkResult.value = result(id)
  checkPhase.value = 'done'
  checkError.value = null
  kind.value = detectKind(s.selection.type)
  branchOverride.value = null
  clearTrack()
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

export function goTo(next: FlowStep): void {
  step.value = next
  notice.value = null
  if (next < 3) applyPending()
}

/** Back to Select for the next hand-off ("New handoff"). Keeps the live selection, checks and repositories. */
export function startOver(): void {
  clearTrack()
  branchOverride.value = null
  view.value = 'prompt'
  notice.value = null
  step.value = 0
  applyPending()
}

/** The live tab starts with nothing: releases and screens come from the team History and the file, never the samples. */
export function clearLibrary(): void {
  releases.value = []
  releasesPhase.value = 'idle'
  releasesProblem.value = null
  releaseId.value = null
  impactResult.value = null
  impactPhase.value = 'idle'
  impactError.value = null
  leftOut.value = []
}

export function reset(): void {
  pendingSelection.value = null
  selectScenario('ready')
  fileName.value = FILE_NAME
  fileKey.value = null
  mcpConnected.value = true
  targets.value = SAMPLE_TARGETS
  alternateConnections.value = []
  issueKey.value = ''
  mode.value = 'build'
  styling.value = STYLINGS[0]
  include.value = INCLUDE_ALL
  view.value = 'prompt'
  releases.value = SAMPLE_RELEASES
  releasesPhase.value = 'done'
  releasesProblem.value = null
  releaseId.value = SAMPLE_RELEASES[0]?.id ?? null
  impactResult.value = SAMPLE_IMPACT
  impactPhase.value = 'done'
  impactError.value = null
  leftOut.value = []
}
