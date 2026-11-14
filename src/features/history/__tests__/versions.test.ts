import { describe, it, expect } from 'vitest'
import type { HandlerContext } from '@shared/bridge'
import { MSG, type VersionDiff, type VersionsResult } from '../messages'
import { MAX_STRUCTURE_ROWS, diffStructure, isAutosave, structureOf, toVersions, type RestFile } from '../versions'
import { NO_FILE_KEY, NO_REST_KEY, createVersionsHandlers } from '../sandbox/versions-handlers'
import { dualFileWith } from '@shared/integrations/testing'

const page = (id: string, name: string, children: RestFile['document'][] = []) => ({ id, name, type: 'CANVAS', children: children as never })
const node = (id: string, name: string, type = 'FRAME') => ({ id, name, type })

describe('toVersions', () => {
  it('keeps the versions in range, newest first, and marks autosaves', () => {
    const list = toVersions([
      { id: 1, created_at: '2026-11-10T10:00:00Z', label: 'Old', user: { handle: 'Anita' } },
      { id: '3', created_at: '2026-11-12T09:00:00Z', label: null, description: null, user: { handle: 'Ravi' } },
      { id: '2', created_at: '2026-11-11T09:00:00Z', label: ' Spacing v2 ', description: 'Scale', user: {} },
      { id: 'bad', created_at: '2026-11-12T09:00:00Z' },
    ], '2026-11-11T00:00:00Z')
    expect(list).toEqual([
      { id: '3', at: '2026-11-12T09:00:00Z', label: '', description: '', by: 'Ravi' },
      { id: '2', at: '2026-11-11T09:00:00Z', label: 'Spacing v2', description: 'Scale', by: 'Someone' },
    ])
    expect(isAutosave(list[0]!)).toBe(true)
    expect(isAutosave(list[1]!)).toBe(false)
  })
})

describe('diffStructure', () => {
  const before: RestFile = { document: { id: '0:0', name: 'Doc', type: 'DOCUMENT', children: [page('1:1', 'Atoms', [node('2:1', 'Button states'), node('2:2', 'Old buttons', 'SECTION')] as never)] }, components: { '5:1': { name: 'Chip' } } }
  const after: RestFile = { document: { id: '0:0', name: 'Doc', type: 'DOCUMENT', children: [page('1:1', 'Atoms', [node('2:1', 'Button · States')] as never), page('1:2', 'Molecules', [node('2:3', 'Filter chip', 'COMPONENT_SET')] as never)] }, components: {} }

  it('lists what was added, renamed and deleted, pages first', () => {
    const diff = diffStructure(before, after)
    expect(diff.changes.map((c) => `${c.kind} ${c.what} ${c.name} · ${c.detail}`)).toEqual([
      'added Page Molecules · New page',
      'modified Frame Button · States · Renamed from Button states on Atoms',
      'removed Component Chip · Deleted component',
      'added Component set Filter chip · New component set on Molecules',
      'removed Section Old buttons · Deleted section on Atoms',
    ])
    expect(diff.note).toMatch(/variable values are not kept/)
  })

  it('says when there is nothing earlier, and caps the rows', () => {
    expect(diffStructure(null, after)).toEqual({ changes: [], note: expect.stringMatching(/oldest version/) })
    const many: RestFile = { document: { id: '0', name: 'D', type: 'DOCUMENT', children: [page('1:1', 'P', Array.from({ length: MAX_STRUCTURE_ROWS + 5 }, (_, i) => node(`9:${i}`, `F${i}`)) as never)] } }
    const diff = diffStructure({ document: { id: '0', name: 'D', type: 'DOCUMENT', children: [page('1:1', 'P')] } }, many)
    expect(diff.changes).toHaveLength(MAX_STRUCTURE_ROWS)
    expect(diff.note).toContain('5 more changes are not listed.')
    expect(structureOf(many).size).toBe(MAX_STRUCTURE_ROWS + 6)
  })
})

describe('versions handlers', () => {
  function setup(fileKey: string | null = 'FILE', token = 'figd_x') {
    const urls: string[] = []
    const handlers = createVersionsHandlers({
      readDualFile: async () => dualFileWith(['LIB'], token),
      fetch: async (url) => {
        urls.push(url)
        const body = url.includes('/versions') ? { versions: [{ id: '7', created_at: '2026-11-12T09:00:00Z', label: 'v7', user: { handle: 'Praveen' } }] }
          : { document: { id: '0', name: 'D', type: 'DOCUMENT', children: [page('1:1', url.includes('version=7') ? 'Atoms v2' : 'Atoms')] } }
        return { status: 200, text: async () => JSON.stringify(body) }
      },
      sleep: async () => undefined,
      now: () => new Date('2026-11-12T12:00:00Z'),
      fileKey: () => fileKey,
      fileName: () => 'Project Bluebird UI',
    })
    const call = <T>(type: string, payload: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<T>)(payload, {} as HandlerContext)
    return { urls, call }
  }

  it('reads the open file’s versions with the Dual File key', async () => {
    const t = setup()
    expect(await t.call<VersionsResult>(MSG.versions, { days: 7 })).toEqual({ file: 'Project Bluebird UI', versions: [{ id: '7', at: '2026-11-12T09:00:00Z', label: 'v7', description: '', by: 'Praveen' }] })
    expect(t.urls).toEqual(['https://api.figma.com/v1/files/FILE/versions?page_size=50'])
  })

  it('compares a version with the one before it', async () => {
    const t = setup()
    const diff = await t.call<VersionDiff>(MSG.versionDiff, { id: '7', previousId: '6' })
    expect(diff.changes).toEqual([{ kind: 'modified', what: 'Page', name: 'Atoms v2', detail: 'Renamed from Atoms' }])
    await expect(t.call(MSG.versionDiff, { id: '7; drop', previousId: null })).rejects.toThrow()
  })

  it('says what Settings need', async () => {
    expect(await setup(null).call<VersionsResult>(MSG.versions, { days: 7 })).toMatchObject({ problem: NO_FILE_KEY, needsSettings: true })
    expect(await setup('FILE', '').call<VersionsResult>(MSG.versions, { days: 7 })).toMatchObject({ problem: NO_REST_KEY, needsSettings: true })
    await expect(setup('FILE', '').call(MSG.versionDiff, { id: '7', previousId: null })).rejects.toThrow(NO_REST_KEY)
  })
})
