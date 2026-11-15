import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS, MCP_SCENARIOS } from './schema'
import { MCP_SCENARIO_LABEL, connectedScenarios, mcpScenarioKeys, mcpTarget, mcpTargetProblem, mcpTargetState } from './mcp'

const D = DEFAULT_INTEGRATIONS.mcp
const ALL = {
  ...D,
  componentRepo: ' acme/design-system ', componentBranch: 'develop', componentToken: ' ghp_c ', componentFramework: 'Vue + TypeScript', componentFolder: 'packages/ui',
  screenRepo: 'acme/web', screenBranch: '', screenToken: 'ghp_s', screenFolder: 'src/pages', screenPackage: '@acme/ui',
  libraryRepo: 'acme/app', libraryToken: 'ghp_l', libraryPullRequests: 'One for all screens',
}

describe('mcpTarget', () => {
  it('reads each scenario from its own keys, trimmed', () => {
    expect(mcpTarget(ALL, 'component')).toEqual({ scenario: 'component', repo: 'acme/design-system', branch: 'develop', token: 'ghp_c', framework: 'Vue + TypeScript', folder: 'packages/ui', designPackage: '', pullRequests: '' })
    expect(mcpTarget(ALL, 'screen')).toEqual({ scenario: 'screen', repo: 'acme/web', branch: 'main', token: 'ghp_s', framework: 'React + TypeScript', folder: 'src/pages', designPackage: '@acme/ui', pullRequests: '' })
    expect(mcpTarget(ALL, 'library')).toEqual({ scenario: 'library', repo: 'acme/app', branch: 'main', token: 'ghp_l', framework: '', folder: '', designPackage: '', pullRequests: 'One for all screens' })
  })

  it('falls back to main when the branch is blank, and to empty text for a key an old store never had', () => {
    expect(mcpTarget({ ...D, componentBranch: '   ' }, 'component').branch).toBe('main')
    const sparse = { enabled: true } as unknown as typeof D
    expect(mcpTarget(sparse, 'library')).toEqual({ scenario: 'library', repo: '', branch: 'main', token: '', framework: '', folder: '', designPackage: '', pullRequests: '' })
  })
})

describe('mcpTargetState and connectedScenarios', () => {
  it('needs both the repository and the token of the same scenario', () => {
    expect(MCP_SCENARIOS.map((s) => mcpTargetState(D, s))).toEqual(['empty', 'empty', 'empty'])
    expect(mcpTargetState({ ...D, screenRepo: 'acme/web' }, 'screen')).toBe('incomplete')
    expect(mcpTargetState({ ...D, screenToken: 'ghp_s' }, 'screen')).toBe('incomplete')
    expect(mcpTargetState({ ...D, screenRepo: '  ', screenToken: 'ghp_s' }, 'screen')).toBe('incomplete')
    expect(mcpTargetState({ ...D, screenRepo: 'acme/web', screenToken: 'ghp_s' }, 'screen')).toBe('connected')
    expect(mcpTargetState({ ...D, screenRepo: 'acme/web', componentToken: 'ghp_c' }, 'component')).toBe('incomplete')
  })

  it('lists the connected scenarios in scenario order', () => {
    expect(connectedScenarios(D)).toEqual([])
    expect(connectedScenarios({ ...D, componentRepo: 'acme/ds', libraryToken: 'ghp_l' })).toEqual([])
    expect(connectedScenarios({ ...D, libraryRepo: 'acme/app', libraryToken: 'ghp_l', componentRepo: 'acme/ds', componentToken: 'ghp_c', screenRepo: 'acme/web' })).toEqual(['component', 'library'])
    expect(connectedScenarios(ALL)).toEqual(['component', 'screen', 'library'])
  })

  it('counts a scenario as connected even while the section is off: the switch is the caller’s to read', () => {
    expect(connectedScenarios({ ...ALL, enabled: false })).toEqual(['component', 'screen', 'library'])
  })
})

describe('mcpScenarioKeys', () => {
  it('gives the stored keys of one scenario and none of another’s', () => {
    expect(mcpScenarioKeys(D, 'component')).toEqual(['componentRepo', 'componentBranch', 'componentToken', 'componentFramework', 'componentFolder'])
    expect(mcpScenarioKeys(D, 'screen')).toEqual(['screenRepo', 'screenBranch', 'screenToken', 'screenFramework', 'screenFolder', 'screenPackage'])
    expect(mcpScenarioKeys(D, 'library')).toEqual(['libraryRepo', 'libraryBranch', 'libraryToken', 'libraryPullRequests'])
  })
})

describe('mcpTargetProblem', () => {
  it('says to turn the section on before anything else', () => {
    expect(mcpTargetProblem({ ...ALL, enabled: false }, 'component')).toBe('Turn on MCP + code sync in Settings')
  })

  it('names what is missing and the scenario it is missing for', () => {
    expect(mcpTargetProblem(D, 'component')).toBe('Add the repository and personal access token for Component to Storybook in Settings › MCP + code sync')
    expect(mcpTargetProblem({ ...D, screenRepo: 'acme/web' }, 'screen')).toBe('Add the personal access token for Screen to code in Settings › MCP + code sync')
    expect(mcpTargetProblem({ ...D, libraryToken: 'ghp_l' }, 'library')).toBe('Add the repository for Library update to screens in Settings › MCP + code sync')
    for (const scenario of MCP_SCENARIOS) expect(mcpTargetProblem(D, scenario)).toContain(MCP_SCENARIO_LABEL[scenario])
  })

  it('points at the scenario whose own fields break a rule, the shared Enterprise URL included', () => {
    expect(mcpTargetProblem({ ...ALL, componentRepo: 'design-system' }, 'component')).toBe('Fix the Component to Storybook fields in Settings › MCP + code sync')
    expect(mcpTargetProblem({ ...ALL, screenPackage: 'Acme UI' }, 'screen')).toBe('Fix the Screen to code fields in Settings › MCP + code sync')
    expect(mcpTargetProblem({ ...ALL, libraryPullRequests: 'Two' }, 'library')).toBe('Fix the Library update to screens fields in Settings › MCP + code sync')
    expect(mcpTargetProblem({ ...ALL, enterpriseUrl: 'github.acme.com' }, 'library')).toBe('Fix the Library update to screens fields in Settings › MCP + code sync')
  })

  it('is not held up by another scenario’s mistake', () => {
    const mixed = { ...ALL, componentRepo: 'design-system', screenToken: '' }
    expect(mcpTargetProblem(mixed, 'library')).toBeNull()
    expect(mcpTargetProblem(mixed, 'screen')).toContain('personal access token')
  })

  it('returns null when the scenario can be used', () => {
    for (const scenario of MCP_SCENARIOS) expect(mcpTargetProblem(ALL, scenario)).toBeNull()
    expect(mcpTargetProblem({ ...ALL, enterpriseUrl: 'https://github.acme.com' }, 'screen')).toBeNull()
  })
})
