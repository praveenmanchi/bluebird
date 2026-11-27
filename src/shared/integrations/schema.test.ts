import { describe, it, expect } from 'vitest'
import { dualFileWith } from './testing'
import { DEFAULT_INTEGRATIONS, MCP_SCENARIOS, SECRET_FIELDS, figmaFileKey, mergeIntegrations, migrateMcp, normalizeIntegration } from './schema'

describe('Dual File settings', () => {
  it('turns a pasted Figma URL into its file key (the main file key for a branch URL)', () => {
    expect(figmaFileKey('https://www.figma.com/design/JPZ7koqomjcjczGQuhIMVH/Plugin-UI?node-id=1-2')).toBe('JPZ7koqomjcjczGQuhIMVH')
    expect(figmaFileKey('figma.com/file/AbC123/x')).toBe('AbC123')
    expect(figmaFileKey('https://www.figma.com/design/AbC123/branch/Br4nch/x')).toBe('AbC123')
    expect(figmaFileKey('  AbC123 ')).toBe('AbC123')
  })

  it('normalizes Dual File URLs to keys, names blank files and trims the token; other text is only trimmed', () => {
    const df = normalizeIntegration(dualFileWith([{ id: ' https://figma.com/design/K1/x ', name: '  ' }, { id: 'K2', name: ' Icons ', role: ' Components ' }], ' tok '), 'dualFile')
    expect(df).toMatchObject({ token: 'tok', files: [{ name: 'File 1', id: 'K1', role: 'Variables + Components' }, { name: 'Icons', id: 'K2', role: 'Components' }] })
    expect(normalizeIntegration({ ...DEFAULT_INTEGRATIONS.github, repo: ' https://figma.com/design/K1/x ' }, 'github').repo).toBe('https://figma.com/design/K1/x')
  })

  it('starts with one empty file that holds both', () => {
    expect(DEFAULT_INTEGRATIONS.dualFile).toEqual({ enabled: true, token: '', files: [{ name: 'File 1', id: '', role: 'Variables + Components' }] })
  })

  it('migrates the oldest Variables / Components fields into one token and two files', () => {
    const merged = mergeIntegrations({ dualFile: { enabled: false, variablesFileId: 'V1', variablesApiKey: 'kv', componentsFileId: 'C1', componentsApiKey: 'kc' } })
    expect(merged.dualFile).toEqual({ enabled: false, token: 'kv', files: [{ name: 'File 1', id: 'V1', role: 'Variables' }, { name: 'File 2', id: 'C1', role: 'Components' }] })
  })

  it('migrates File 1 / File 2 / extra files: first key becomes the token, the first three listed files stay', () => {
    const merged = mergeIntegrations({ dualFile: {
      enabled: true, file1Id: '', file1Key: '', file1Role: 'Variables', file2Id: 'C1', file2Key: 'k2', file2Role: 'Components',
      extraFiles: [{ id: 'E1', key: 'k3', role: 'Variables' }, { id: 'E2', key: '', role: 'Components' }, { id: 'E3', key: '', role: 'Components' }],
    } })
    expect(merged.dualFile).toEqual({ enabled: true, token: 'k2', files: [
      { name: 'File 1', id: 'C1', role: 'Components' }, { name: 'File 2', id: 'E1', role: 'Variables' }, { name: 'File 3', id: 'E2', role: 'Components' },
    ] })
    expect(mergeIntegrations({ dualFile: { enabled: true, file1Id: '', file1Key: '', file1Role: 'Variables' } }).dualFile).toEqual(DEFAULT_INTEGRATIONS.dualFile)
  })

  it('keeps the current shape as stored, and drops a list longer than three', () => {
    const stored = dualFileWith(['X', { id: 'Y', name: 'Icons', role: 'Components' }], 'k')
    expect(mergeIntegrations({ dualFile: stored }).dualFile).toEqual(stored)
    expect(mergeIntegrations({ dualFile: dualFileWith(['A', 'B', 'C', 'D'], 'k') }).dualFile).toEqual(DEFAULT_INTEGRATIONS.dualFile)
  })
})

describe('MCP + code sync settings', () => {
  const D = DEFAULT_INTEGRATIONS.mcp

  it('starts with no repository or token for any scenario, and keeps every token a secret', () => {
    for (const scenario of MCP_SCENARIOS) {
      expect(D[`${scenario}Repo`]).toBe('')
      expect(D[`${scenario}Token`]).toBe('')
      expect(D[`${scenario}Branch`]).toBe('main')
    }
    expect(SECRET_FIELDS.mcp).toEqual(['componentToken', 'screenToken', 'libraryToken'])
  })

  it('migrateMcp moves the old single repository, branch and token to the Component scenario', () => {
    expect(migrateMcp({ enabled: false, repo: ' org/web-components ', baseBranch: 'develop', token: ' ghp_old ', filePath: 'tokens.json', outputFormat: 'raw-json', branchTemplate: 'ds/{date}', enterpriseUrl: 'https://github.acme.com' })).toEqual({
      enabled: false, componentRepo: 'org/web-components', componentBranch: 'develop', componentToken: 'ghp_old', enterpriseUrl: 'https://github.acme.com',
    })
    expect(migrateMcp({ repo: 'org/web', token: 12 })).toEqual({ componentRepo: 'org/web', componentBranch: 'main', componentToken: '', enterpriseUrl: '' })
  })

  it('migrateMcp leaves the current shape, and anything that is not an old section, as stored', () => {
    const current = { ...D, screenRepo: 'org/web', screenToken: 'ghp_s' }
    expect(migrateMcp(current)).toBe(current)
    // Both shapes at once: the current keys win, the old ones are dropped by the schema.
    const both = { ...current, repo: 'org/old', token: 'ghp_old' }
    expect(migrateMcp(both)).toBe(both)
    expect(migrateMcp({ enabled: false })).toEqual({ enabled: false })
    for (const value of [undefined, null, 'nope', 7, ['repo']]) expect(migrateMcp(value)).toBe(value)
  })

  it('mergeIntegrations reads a section stored before one repository per scenario', () => {
    const merged = mergeIntegrations({ mcp: { enabled: true, repo: 'org/web-components', baseBranch: 'master', token: 'ghp_old', filePath: 'src/tokens/design-tokens.json', outputFormat: 'style-dictionary', branchTemplate: 'ds/token-update-{date}', enterpriseUrl: '' } })
    expect(merged.mcp).toEqual({ ...D, componentRepo: 'org/web-components', componentBranch: 'master', componentToken: 'ghp_old' })
    expect(mergeIntegrations({ mcp: { enabled: false, repo: '', baseBranch: '', token: '' } }).mcp).toEqual({ ...D, enabled: false })
  })

  it('mergeIntegrations keeps the current shape as stored and falls back to the defaults for one that no longer parses', () => {
    const stored = { ...D, libraryRepo: 'org/app', libraryToken: 'ghp_l', libraryPullRequests: 'One for all screens' }
    expect(mergeIntegrations({ mcp: stored }).mcp).toEqual(stored)
    expect(mergeIntegrations({ mcp: { ...stored, libraryRepo: 12 } }).mcp).toEqual(D)
    expect(mergeIntegrations({}).mcp).toEqual(D)
  })
})

describe('code host', () => {
  it('normalises a Bitbucket repository link like a GitHub one, keyed on the chosen host', () => {
    const bb = normalizeIntegration({ ...DEFAULT_INTEGRATIONS.github, host: 'bitbucket', baseUrl: 'https://bitbucket.org/acme/design-tokens/src/main/' }, 'github')
    expect(bb).toMatchObject({ baseUrl: '', repo: 'acme/design-tokens' })
    const dc = normalizeIntegration({ ...DEFAULT_INTEGRATIONS.github, host: 'bitbucket', baseUrl: 'bitbucket.acme.internal' }, 'github')
    expect(dc.baseUrl).toBe('https://bitbucket.acme.internal')
  })

  it('reads settings stored before Bitbucket as GitHub', () => {
    const { host: _h, email: _e, ...old } = DEFAULT_INTEGRATIONS.github
    expect(mergeIntegrations({ github: { ...old, repo: 'acme/tokens' } }).github).toMatchObject({ host: 'github', email: '', repo: 'acme/tokens' })
    expect(mergeIntegrations({}).mcp).toMatchObject({ componentHost: 'github', screenHost: 'github', libraryHost: 'github' })
  })
})
