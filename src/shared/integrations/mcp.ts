// Settings › MCP + code sync, one scenario at a time. Each MCP hand-off scenario has its own
// repository, base branch and token, so a team connects only the scenario it works on; this
// module is the one place that knows which stored key belongs to which scenario.
import { MCP_SCENARIOS, type IntegrationValues, type McpScenario } from './schema'
import { validateIntegration } from './validate'

type Mcp = IntegrationValues<'mcp'>

export const MCP_SCENARIO_LABEL: Readonly<Record<McpScenario, string>> = {
  component: 'Component to Storybook',
  screen: 'Screen to code',
  library: 'Library update to screens',
}

/** Where one scenario's hand-offs go, as stored (trimmed). The token never leaves the sandbox. */
export interface McpTarget {
  scenario: McpScenario
  repo: string
  branch: string
  token: string
  /** Empty for the library scenario: it updates files that already exist. */
  framework: string
  folder: string
  /** The package screens import design-system components from; screen scenario only. */
  designPackage: string
  /** Library scenario only: one pull request per screen, or one for all. */
  pullRequests: string
}

/** `connected`: repository and token are both filled in. `incomplete`: only one of them. */
export type McpTargetState = 'connected' | 'incomplete' | 'empty'

const t = (v: string | undefined) => (v ?? '').trim()

export function mcpTarget(mcp: Mcp, scenario: McpScenario): McpTarget {
  if (scenario === 'component') {
    return { scenario, repo: t(mcp.componentRepo), branch: t(mcp.componentBranch) || 'main', token: t(mcp.componentToken), framework: t(mcp.componentFramework), folder: t(mcp.componentFolder), designPackage: '', pullRequests: '' }
  }
  if (scenario === 'screen') {
    return { scenario, repo: t(mcp.screenRepo), branch: t(mcp.screenBranch) || 'main', token: t(mcp.screenToken), framework: t(mcp.screenFramework), folder: t(mcp.screenFolder), designPackage: t(mcp.screenPackage), pullRequests: '' }
  }
  return { scenario, repo: t(mcp.libraryRepo), branch: t(mcp.libraryBranch) || 'main', token: t(mcp.libraryToken), framework: '', folder: '', designPackage: '', pullRequests: t(mcp.libraryPullRequests) }
}

export function mcpTargetState(mcp: Mcp, scenario: McpScenario): McpTargetState {
  const { repo, token } = mcpTarget(mcp, scenario)
  if (repo && token) return 'connected'
  return repo || token ? 'incomplete' : 'empty'
}

/** Scenarios with a repository and a token. */
export const connectedScenarios = (mcp: Mcp): McpScenario[] => MCP_SCENARIOS.filter((s) => mcpTargetState(mcp, s) === 'connected')

/** The stored keys of one scenario (`componentRepo`, …): every key that starts with its name. */
export const mcpScenarioKeys = (mcp: Mcp, scenario: McpScenario): string[] => Object.keys(mcp).filter((k) => k.startsWith(scenario))

/** Why a scenario can't be used yet, as one sentence that names the place to fix it; null when it can. */
export function mcpTargetProblem(mcp: Mcp, scenario: McpScenario): string | null {
  const label = MCP_SCENARIO_LABEL[scenario]
  if (!mcp.enabled) return 'Turn on MCP + code sync in Settings'
  const { repo, token } = mcpTarget(mcp, scenario)
  const missing = [...(repo ? [] : ['repository']), ...(token ? [] : ['personal access token'])]
  if (missing.length) return `Add the ${missing.join(' and ')} for ${label} in Settings › MCP + code sync`
  const own = new Set([...mcpScenarioKeys(mcp, scenario), 'enterpriseUrl'])
  const invalid = Object.keys(validateIntegration('mcp', mcp)).filter((k) => own.has(k))
  if (invalid.length) return `Fix the ${label} fields in Settings › MCP + code sync`
  return null
}
