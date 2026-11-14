import { describe, it, expect } from 'vitest'
import { dualFileWith } from './testing'
import { DEFAULT_INTEGRATIONS, figmaFileKey, mergeIntegrations, normalizeIntegration } from './schema'

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
