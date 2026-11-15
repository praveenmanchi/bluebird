// Fixture handlers for browser-only development (?mode=mock) and UI tests: the
// selection, the checks, the repositories and the pull request come from one scenario.
import type { HandlerMap } from '@shared/bridge'
import { MCP_SCENARIOS, type McpScenario } from '@shared/integrations'
import { FILE_NAME, SAMPLE_IMPACT, SAMPLE_PULL, SAMPLE_RELEASES, SAMPLE_TARGETS, SCENARIOS, noTarget, type HandoffScenarioId } from './fixtures'
import { MSG, checkRequestSchema, impactRequestSchema, openRequestSchema, trackRequestSchema, type CheckResult, type ImpactResult, type McpStatus, type ReleasesResult, type SelectionResult, type TrackResult } from './messages'
import { combinedState } from './library'

export interface McpMockOptions {
  scenario?: HandoffScenarioId
  /** Nothing selected on the canvas (Figma "Empty · Nothing selected"). */
  nothingSelected?: boolean
  /** Scenarios nobody set up in Settings › MCP + code sync (Figma "Empty · Repository not connected"). */
  notConnected?: readonly McpScenario[]
  /** figma.fileKey; private plugins only, so the default mirrors a public plugin. */
  fileKey?: string | null
  /** What GitHub answers on mcp:track. Default: waiting on the first look, open from the second. */
  pull?: TrackResult['state']
  /** Settings › Storage isn't set up, so the team History (and its releases) can't be read. */
  noHistory?: boolean
  /** The scan finds no screen using the release's components. */
  noImpact?: boolean
}

export function createMockHandlers(options: McpMockOptions = {}): HandlerMap {
  const { scenario = 'ready', nothingSelected = false, notConnected = [], fileKey = null, pull, noHistory = false, noImpact = false } = options
  const s = SCENARIOS[scenario]
  let looks = 0
  return {
    [MSG.selection]: async (): Promise<SelectionResult> => ({ selected: nothingSelected ? null : s.selection, count: nothingSelected ? 0 : 1, fileName: FILE_NAME, fileKey }),
    [MSG.check]: async (payload: unknown): Promise<CheckResult> => {
      const { nodeId } = checkRequestSchema.parse(payload)
      if (nodeId !== s.selection.nodeId) throw new Error('That frame no longer exists. Select it again.')
      return { nodeId, readiness: s.readiness, checks: s.checks, stats: s.stats, components: s.components }
    },
    [MSG.status]: async (): Promise<McpStatus> => ({
      targets: Object.fromEntries(MCP_SCENARIOS.map((id) => [id, notConnected.includes(id) ? noTarget(id) : SAMPLE_TARGETS[id]])) as McpStatus['targets'],
    }),
    [MSG.track]: async (payload: unknown): Promise<TrackResult> => {
      const { scenario: id, branch, branches } = trackRequestSchema.parse(payload)
      looks += 1
      const state = pull ?? (looks > 1 ? 'open' : 'waiting')
      const repo = SAMPLE_TARGETS[id].repo
      if (branches) {
        // One pull request per screen: the first shows up on the first look, the rest on the second.
        const pulls = branches.map((b, i) => (state === 'waiting' && i > 0) || (pull === 'waiting')
          ? { branch: b, state: 'waiting' as const }
          : { branch: b, state: state === 'waiting' ? 'open' as const : state, number: SAMPLE_PULL.number + i, url: `https://github.com/${repo}/pull/${SAMPLE_PULL.number + i}`, title: `chore: update ${b.split('/').pop()}` })
        return { state: combinedState(pulls), repo, branch, pulls }
      }
      return state === 'waiting' ? { state, repo, branch } : { state, repo, branch, ...SAMPLE_PULL }
    },
    [MSG.releases]: async (): Promise<ReleasesResult> => noHistory
      ? { releases: [], problem: 'Add the repository and API key in Settings › GitHub output configuration. Library releases come from the team History.' }
      : { releases: SAMPLE_RELEASES },
    [MSG.impact]: async (payload: unknown): Promise<ImpactResult> => {
      const { components } = impactRequestSchema.parse(payload)
      const wanted = new Set(components)
      const screens = noImpact ? [] : SAMPLE_IMPACT.screens
        .map((s) => ({ ...s, uses: s.uses.filter((u) => wanted.has(u.name)) }))
        .filter((s) => s.uses.length > 0)
      return { ...SAMPLE_IMPACT, screens }
    },
    [MSG.focus]: async () => undefined,
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
    },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
