import { describe, it, expect } from 'vitest'
import { createMockTransport, createRpcClient } from '@shared/bridge'
import { libraryPill, libraryState, loadLibraryState } from '../status'
import { LIBRARIES_MSG, type LibraryFile, type LibraryIndex } from '../types'

const file = (slot: 1 | 2, patch: Partial<LibraryFile> = {}): LibraryFile => ({
  slot, fileKey: `K${slot}`, name: slot === 1 ? 'Brand UI' : 'Components', roles: slot === 1 ? ['variables'] : ['components'],
  variables: slot === 1 ? 421 : 0, components: slot === 1 ? 0 : 87, collections: [], ...patch,
})
const ready = (files: LibraryFile[]) => ({ status: 'ready' as const, index: { files, variables: [], components: [], collections: [], loadedAt: 0 } satisfies LibraryIndex })

describe('libraryPill', () => {
  it('says connected, with what each file holds on hover', () => {
    expect(libraryPill(ready([file(1), file(2)]))).toEqual({
      status: 'good', label: 'Dual File · connected', title: 'File 1 Brand UI: 421 variables\nFile 2 Components: 87 components',
    })
  })

  it('flags a partly failed or wholly failed connection with the reason', () => {
    const partial = libraryPill(ready([file(1), file(2, { error: 'Figma couldn’t find File 2.' })]))
    expect(partial).toMatchObject({ status: 'issue', label: 'Dual File · 1 of 2 files' })
    expect(partial.title).toContain('File 2 Components: Figma couldn’t find File 2.')
    expect(libraryPill(ready([file(1, { error: 'Figma rejected File 1’s API key.' })]))).toMatchObject({ status: 'error', label: 'Dual File · failed' })
    expect(libraryPill({ status: 'error', message: 'timed out' })).toEqual({ status: 'error', label: 'Dual File · failed', title: 'timed out' })
  })

  it('tells off from not set up, and shows connecting while it loads', () => {
    expect(libraryPill({ status: 'not-configured', reason: 'disabled', message: 'off' }).label).toBe('Dual File · off')
    expect(libraryPill({ status: 'not-configured', reason: 'empty', message: 'add files' })).toEqual({ status: 'issue', label: 'Dual File', title: 'add files' })
    expect(libraryPill({ status: 'loading' }).status).toBe('retry')
  })
})

describe('loadLibraryState', () => {
  it('publishes the sandbox answer, and keeps only the latest of overlapping loads', async () => {
    let answers = 0
    const client = createRpcClient(createMockTransport({
      [LIBRARIES_MSG.load]: async () => (++answers === 1 ? new Promise((r) => setTimeout(() => r(ready([file(1)])), 20)) : ready([file(1), file(2)])),
    }, 0))
    const first = loadLibraryState(client)
    const second = loadLibraryState(client, true)
    await Promise.all([first, second])
    expect(libraryState.value.status === 'ready' && libraryState.value.index.files).toHaveLength(2)
  })

  it('turns a failed call into an error state', async () => {
    const client = createRpcClient(createMockTransport({ [LIBRARIES_MSG.load]: async () => { throw new Error('Figma is rate-limiting requests.') } }, 0))
    expect(await loadLibraryState(client)).toEqual({ status: 'error', message: 'Figma is rate-limiting requests.' })
  })
})
