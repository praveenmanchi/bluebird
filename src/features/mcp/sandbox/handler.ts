// Runs inside Figma. Reads the selection and checks it for the handoff; the
// other actions select and reveal the frame the handoff is about, and open the
// pull request or Jira issue. Code generation and the push stay on fixtures.
import type { HandlerMap } from '@shared/bridge'
import { validateIntegration, type IntegrationValues } from '@shared/integrations'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { MSG, checkRequestSchema, focusRequestSchema, openRequestSchema, type CheckResult, type GithubStatus, type McpStatus } from '../messages'
import { evaluate } from './checks'
import { collectInventory, describeSelection } from './inspect'

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That frame no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

async function check(payload: unknown): Promise<CheckResult> {
  const { nodeId } = checkRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That frame no longer exists. Select it again.')
  return evaluate(await collectInventory(node as SceneNode))
}

/** Settings › MCP + Code Sync, as the Ship step reports it. */
export function githubStatus(mcp: IntegrationValues<'mcp'>): GithubStatus {
  const repo = mcp.repo.trim(), branch = mcp.baseBranch.trim() || 'main'
  if (!mcp.enabled) return { connected: false, repo, branch, problem: 'Turn on MCP + code sync in Settings' }
  const missing = [...(repo ? [] : ['repository']), ...(mcp.token.trim() ? [] : ['personal access token'])]
  if (missing.length) return { connected: false, repo, branch, problem: `Add the ${missing.join(' and ')} in Settings › MCP + code sync` }
  const invalid = Object.keys(validateIntegration('mcp', mcp))
  if (invalid.length) return { connected: false, repo, branch, problem: `Fix the ${invalid.join(' and ')} in Settings › MCP + code sync` }
  return { connected: true, repo, branch }
}

async function status(): Promise<McpStatus> {
  return { github: githubStatus((await readIntegrations(clientStorageRead)).mcp) }
}

export const handlers: HandlerMap = {
  [MSG.selection]: () => describeSelection(),
  [MSG.check]: check,
  [MSG.status]: status,
  [MSG.focus]: focus,
  [MSG.open]: (payload: unknown) => { figma.openExternal(openRequestSchema.parse(payload).url) },
}
