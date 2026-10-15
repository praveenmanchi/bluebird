// Fixture handlers for browser-only development (?mode=mock) and UI tests: the
// selection, the checks and the GitHub connection come from one scenario.
import type { HandlerMap } from '@shared/bridge'
import { FILE_NAME, NO_GITHUB, SAMPLE_GITHUB, SCENARIOS, type HandoffScenarioId } from './fixtures'
import { MSG, checkRequestSchema, openRequestSchema, type CheckResult, type McpStatus, type SelectionResult } from './messages'

export interface McpMockOptions {
  scenario?: HandoffScenarioId
  /** Nothing selected on the canvas (Figma "Empty · Nothing selected"). */
  nothingSelected?: boolean
  /** Settings › MCP + Code Sync incomplete (Figma "Empty · GitHub not connected"). */
  githubConnected?: boolean
  /** figma.fileKey; private plugins only, so the default mirrors a public plugin. */
  fileKey?: string | null
}

export function createMockHandlers(options: McpMockOptions = {}): HandlerMap {
  const { scenario = 'ready', nothingSelected = false, githubConnected = true, fileKey = null } = options
  const s = SCENARIOS[scenario]
  return {
    [MSG.selection]: async (): Promise<SelectionResult> => ({ selected: nothingSelected ? null : s.selection, count: nothingSelected ? 0 : 1, fileName: FILE_NAME, fileKey }),
    [MSG.check]: async (payload: unknown): Promise<CheckResult> => {
      const { nodeId } = checkRequestSchema.parse(payload)
      if (nodeId !== s.selection.nodeId) throw new Error('That frame no longer exists. Select it again.')
      return { nodeId, readiness: s.readiness, checks: s.checks, stats: s.stats }
    },
    [MSG.status]: async (): Promise<McpStatus> => ({ github: githubConnected ? SAMPLE_GITHUB : NO_GITHUB }),
    [MSG.focus]: async () => undefined,
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
    },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
