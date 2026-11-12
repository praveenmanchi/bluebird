import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS, figmaFileKey, mergeIntegrations, normalizeIntegration } from './schema'

describe('Dual File settings', () => {
  it('turns a pasted Figma URL into its file key (the main file key for a branch URL)', () => {
    expect(figmaFileKey('https://www.figma.com/design/JPZ7koqomjcjczGQuhIMVH/Plugin-UI?node-id=1-2')).toBe('JPZ7koqomjcjczGQuhIMVH')
    expect(figmaFileKey('figma.com/file/AbC123/x')).toBe('AbC123')
    expect(figmaFileKey('https://www.figma.com/design/AbC123/branch/Br4nch/x')).toBe('AbC123')
    expect(figmaFileKey('  AbC123 ')).toBe('AbC123')
  })

  it('normalizes only Dual File IDs as URLs; other text is trimmed', () => {
    const df = normalizeIntegration({ ...DEFAULT_INTEGRATIONS.dualFile, file1Id: ' https://figma.com/design/K1/x ', file1Key: ' tok ' }, 'dualFile')
    expect(df).toMatchObject({ file1Id: 'K1', file1Key: 'tok' })
    expect(normalizeIntegration({ ...DEFAULT_INTEGRATIONS.github, repo: ' https://figma.com/design/K1/x ' }, 'github').repo).toBe('https://figma.com/design/K1/x')
  })

  it('migrates the old Variables / Components fields into File 1 and File 2', () => {
    const merged = mergeIntegrations({ dualFile: { enabled: false, variablesFileId: 'V1', variablesApiKey: 'kv', componentsFileId: 'C1', componentsApiKey: 'kc' } })
    expect(merged.dualFile).toEqual({ enabled: false, file1Id: 'V1', file1Key: 'kv', file1Role: 'Variables', file2Id: 'C1', file2Key: 'kc', file2Role: 'Components', extraFiles: [] })
  })

  it('normalises extra files like the two slots and drops empty rows', () => {
    const df = normalizeIntegration({ ...DEFAULT_INTEGRATIONS.dualFile, extraFiles: [{ id: ' https://figma.com/design/K3/x ', key: ' t3 ', role: 'Components' }, { id: '', key: '', role: 'Variables' }] }, 'dualFile')
    expect(df.extraFiles).toEqual([{ id: 'K3', key: 't3', role: 'Components' }])
  })

  it('keeps the new shape as stored', () => {
    const stored = { ...DEFAULT_INTEGRATIONS.dualFile, file1Id: 'X', file1Key: 'k', file1Role: 'Variables + Components' }
    expect(mergeIntegrations({ dualFile: stored }).dualFile).toEqual(stored)
  })
})
