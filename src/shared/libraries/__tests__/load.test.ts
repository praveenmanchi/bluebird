import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { dualFileWith } from '@shared/integrations/testing'
import { describeFile, filesFromSettings, loadLibraries, rolesOf, settingsProblem, testDualFile } from '../load'
import { fakeFigma } from './fixtures'

const df = (patch: Partial<typeof DEFAULT_INTEGRATIONS.dualFile>) => ({ ...DEFAULT_INTEGRATIONS.dualFile, ...patch })

describe('Dual File settings → files', () => {
  it('maps the three choices to roles', () => {
    expect(rolesOf('Variables')).toEqual(['variables'])
    expect(rolesOf('Components')).toEqual(['components'])
    expect(rolesOf('Variables + Components')).toEqual(['variables', 'components'])
  })

  it('reads every listed file with the one token, named as in Settings, skipping rows without a URL', () => {
    expect(filesFromSettings(dualFileWith([{ id: 'A', role: 'Variables', name: 'Core' }, { id: '' }, { id: 'D', role: 'Components' }], ' t1 '))).toEqual([
      { slot: 1, fileKey: 'A', token: 't1', roles: ['variables'], label: 'Core' },
      { slot: 3, fileKey: 'D', token: 't1', roles: ['components'], label: 'File 3' },
    ])
  })

  it('says why nothing loads: off, empty, or invalid', () => {
    expect(settingsProblem(df({ enabled: false }))?.reason).toBe('disabled')
    expect(settingsProblem(df({}))?.message).toContain('Add your library files')
    expect(settingsProblem(dualFileWith(['A']))?.message).toContain('access token')
    expect(settingsProblem(dualFileWith(['A'], 't'))).toBeNull()
  })
})

describe('loadLibraries', () => {
  it('reads each file for its roles only, with the one token', async () => {
    const figma = fakeFigma({}, { V: 'Brand UI', C: 'Components' })
    const index = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'V', role: 'Variables' }, { id: 'C', role: 'Components', name: 'Web components' }], 'tc')), figma.fetch, () => 42)
    expect(index.files).toEqual([
      { slot: 1, fileKey: 'V', name: 'Brand UI', label: 'File 1', roles: ['variables'], variables: 5, components: 0, styles: 2, collections: ['Primitives', 'Brand UI'] },
      { slot: 2, fileKey: 'C', name: 'Components', label: 'Web components', roles: ['components'], variables: 0, components: 2, styles: 2, collections: [] },
    ])
    expect(index.variables).toHaveLength(5)
    expect(index.components.map((c) => c.name)).toEqual(['Button', 'Divider'])
    expect(index.loadedAt).toBe(42)
    expect(figma.calls.filter((c) => c.url.includes('/files/V/')).map((c) => c.url.split('/V')[1])).toEqual(['/meta', '/variables/local', '/styles', '/nodes?ids=30%3A1%2C30%3A2'])
    expect(index.styles?.map((s) => `${s.kind}:${s.name}`)).toEqual(['color:brand/accent', 'text:Heading/H1', 'color:brand/accent', 'text:Heading/H1'])
    expect(index.styles?.[1]).toMatchObject({ kind: 'text', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontWeight: 600, fontSize: 24, lineHeight: 32, letterSpacing: -0.5, fileKey: 'V' })
    expect(index.styles?.[0]).toMatchObject({ kind: 'color', hex: '#0066FF', fileKey: 'V' })
    expect(figma.calls.every((c) => c.url.startsWith('https://api.figma.com/v1/files/'))).toBe(true)
    expect(new Set(figma.calls.filter((c) => c.url.includes('/C/')).map((c) => c.token))).toEqual(new Set(['tc']))
  })

  it('keeps a failing file’s slot with a readable reason while the other file loads', async () => {
    const figma = fakeFigma({ '/V/variables/local': [403, JSON.stringify({ status: 403, err: 'Limited by Figma plan' })] })
    const index = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'V', role: 'Variables' }, { id: 'C', role: 'Components' }], 't')), figma.fetch)
    expect(index.files[0]!.error).toContain('Enterprise')
    expect(index.files[1]!.error).toBeUndefined()
    expect(index.components).toHaveLength(2)
  })

  it.each([
    [401, { status: 401, err: 'Invalid token' }, 'rejected File 1’s API key'],
    [403, { status: 403, err: 'Invalid scope(s): file_variables:read. This endpoint requires the file_variables:read scope' }, 'missing the file_variables:read scope'],
    [404, { status: 404, err: 'Not found' }, 'couldn’t find File 1'],
    [403, { status: 403, err: 'Incorrect account type' }, 'guest or another account type'],
  ])('explains a %i', async (status, body, message) => {
    const figma = fakeFigma({ '/variables/local': [status, JSON.stringify(body)] })
    const index = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'V', role: 'Variables' }], 't')), figma.fetch)
    expect(index.files[0]!.error).toContain(message)
  })

  it('reports a network failure and an empty published library', async () => {
    const offline = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'V', role: 'Variables' }], 't')), async () => { throw new Error('down') })
    expect(offline.files[0]!.error).toContain('api.figma.com')
    const empty = fakeFigma({ '/components': [200, JSON.stringify({ meta: { components: [] } })], '/component_sets': [200, JSON.stringify({ meta: { component_sets: [] } })] })
    const index = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'C', role: 'Components' }], 't')), empty.fetch)
    expect(index.files[0]!.warning).toContain('Publish the library')
  })

  it('reads no styles, and still loads, when the key can’t list them', async () => {
    const figma = fakeFigma({ '/styles': [403, JSON.stringify({ err: 'Invalid scope' })] })
    const index = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'V', role: 'Variables' }], 't')), figma.fetch)
    expect(index.files[0]).toMatchObject({ variables: 5, styles: 0 })
    expect(index.files[0]!.error).toBeUndefined()
    expect(index.styles).toEqual([])
  })

  it('falls back to the key when the name can’t be read', async () => {
    const figma = fakeFigma({ '/meta': [403, JSON.stringify({ err: 'Invalid scope' })] })
    const index = await loadLibraries(filesFromSettings(dualFileWith([{ id: 'V', role: 'Variables' }], 't')), figma.fetch)
    expect(index.files[0]).toMatchObject({ name: 'V', variables: 5 })
  })
})

describe('testDualFile', () => {
  it('summarises each file', async () => {
    const figma = fakeFigma({}, { V: 'Brand UI', C: 'Library' })
    const { message } = await testDualFile(dualFileWith([{ id: 'https://www.figma.com/design/V/x', role: 'Variables', name: 'Core' }, { id: 'C', role: 'Components' }], ' t ', { enabled: false }), figma.fetch)
    expect(message).toBe('Core “Brand UI”: 5 variables in 2 collections, 2 published styles. File 2 “Library”: 2 published components, 2 published styles.')
  })

  it('rejects incomplete values without calling Figma, and a failing file with its reason', async () => {
    const figma = fakeFigma({ '/C/components': [404, '{}'] })
    await expect(testDualFile(df({}), figma.fetch)).rejects.toThrow('Add your library files')
    await expect(testDualFile({ nope: true }, figma.fetch)).rejects.toThrow('incomplete')
    expect(figma.calls).toHaveLength(0)
    await expect(testDualFile(dualFileWith([{ id: 'C', role: 'Components' }], 't'), figma.fetch)).rejects.toThrow('couldn’t find File 1')
  })

  it('describes a both-roles file', () => {
    expect(describeFile({ slot: 1, fileKey: 'K', name: 'DS', roles: ['variables', 'components'], variables: 1, components: 1, collections: ['A'] }))
      .toBe('File 1 “DS”: 1 variable in 1 collection, 1 published component.')
  })
})
