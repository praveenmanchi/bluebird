import { describe, it, expect, vi } from 'vitest'
import { findVariableCollection } from './collection'
import { installFigmaMock } from '../../../tests/mocks/figma'

const MODES = [{ modeId: 'm1', name: 'Bridge' }, { modeId: 'm2', name: 'Ikea' }]

/** A consuming file: nothing local, Brand UI reachable through an enabled library. */
function libraryFile(overrides: { listing?: () => Promise<unknown[]> } = {}) {
  const imported: Record<string, unknown> = {
    'key-ink': { id: 'VariableID:abc/1:1', name: 'text/primary', resolvedType: 'COLOR', variableCollectionId: 'VariableCollectionId:abc/1:0', valuesByMode: {} },
    'key-radius': { id: 'VariableID:abc/1:2', name: 'radius/md', resolvedType: 'FLOAT', variableCollectionId: 'VariableCollectionId:abc/1:0', valuesByMode: {} },
  }
  const importVariableByKeyAsync = vi.fn(async (key: string) => imported[key])
  const getVariablesInLibraryCollectionAsync = vi.fn(async () => [{ key: 'key-ink', name: 'text/primary', resolvedType: 'COLOR' }, { key: 'key-radius', name: 'radius/md', resolvedType: 'FLOAT' }])
  installFigmaMock({
    variables: {
      getLocalVariableCollectionsAsync: async () => [],
      getVariableByIdAsync: async () => null,
      importVariableByKeyAsync,
      getVariableCollectionByIdAsync: async (id: string) => (id === 'VariableCollectionId:abc/1:0' ? { id, name: 'Brand UI', modes: MODES, remote: true } : null),
    } as unknown as PluginAPI['variables'],
    teamLibrary: {
      getAvailableLibraryVariableCollectionsAsync: overrides.listing ?? (async () => [{ key: 'coll-key', name: 'Brand UI', libraryName: 'Plugin UI' }]),
      getVariablesInLibraryCollectionAsync,
    } as unknown as PluginAPI['teamLibrary'],
  })
  return { importVariableByKeyAsync, getVariablesInLibraryCollectionAsync }
}

describe('findVariableCollection', () => {
  it('reads the file’s own collection first and never touches the libraries', async () => {
    const listing = vi.fn(async () => [])
    installFigmaMock({
      variables: {
        getLocalVariableCollectionsAsync: async () => [{ id: 'c1', name: 'Brand UI', modes: MODES, variableIds: ['v1', 'gone'] }],
        getVariableByIdAsync: async (id: string) => (id === 'v1' ? { id: 'v1', name: 'text/primary' } : null),
      } as unknown as PluginAPI['variables'],
      teamLibrary: { getAvailableLibraryVariableCollectionsAsync: listing } as unknown as PluginAPI['teamLibrary'],
    })
    const found = await findVariableCollection('Brand UI')
    expect(found).toMatchObject({ name: 'Brand UI', modes: MODES })
    expect(found?.libraryName).toBeUndefined()
    expect(found?.variables.map((v) => v.id)).toEqual(['v1'])
    expect(listing).not.toHaveBeenCalled()
  })

  it('imports the collection from an enabled library when the file has no copy', async () => {
    const { importVariableByKeyAsync } = libraryFile()
    const found = await findVariableCollection('Brand UI')
    expect(found).toMatchObject({ name: 'Brand UI', modes: MODES, libraryName: 'Plugin UI' })
    expect(found?.variables.map((v) => v.name)).toEqual(['text/primary', 'radius/md'])
    expect(importVariableByKeyAsync.mock.calls.map(([key]) => key)).toEqual(['key-ink', 'key-radius'])
  })

  it('imports a library collection once per plugin run', async () => {
    const { importVariableByKeyAsync, getVariablesInLibraryCollectionAsync } = libraryFile()
    await findVariableCollection('Brand UI')
    await findVariableCollection('Brand UI')
    expect(getVariablesInLibraryCollectionAsync).toHaveBeenCalledTimes(1)
    expect(importVariableByKeyAsync).toHaveBeenCalledTimes(2)
  })

  it('returns null when neither the file nor its libraries have the collection', async () => {
    libraryFile({ listing: async () => [{ key: 'other', name: 'Some Other Kit', libraryName: 'X' }] })
    expect(await findVariableCollection('Brand UI')).toBeNull()
  })

  it('returns null when the plugin cannot see libraries at all', async () => {
    installFigmaMock()
    expect(await findVariableCollection('Brand UI')).toBeNull()
  })

  it('refuses to guess when two enabled libraries both publish the collection', async () => {
    libraryFile({ listing: async () => [{ key: 'a', name: 'Brand UI', libraryName: 'Plugin UI' }, { key: 'b', name: 'Brand UI', libraryName: 'Plugin UI (old)' }] })
    await expect(findVariableCollection('Brand UI')).rejects.toThrow('several enabled libraries (Plugin UI, Plugin UI (old))')
  })

  it('imports large collections in batches', async () => {
    const keys = Array.from({ length: 60 }, (_, i) => `k${i}`)
    let inFlight = 0
    let peak = 0
    installFigmaMock({
      variables: {
        getLocalVariableCollectionsAsync: async () => [],
        importVariableByKeyAsync: async (key: string) => {
          inFlight += 1; peak = Math.max(peak, inFlight)
          await Promise.resolve()
          inFlight -= 1
          return { id: key, name: key, variableCollectionId: 'rc', valuesByMode: {} }
        },
        getVariableCollectionByIdAsync: async () => ({ id: 'rc', name: 'Brand UI', modes: MODES }),
      } as unknown as PluginAPI['variables'],
      teamLibrary: {
        getAvailableLibraryVariableCollectionsAsync: async () => [{ key: 'c', name: 'Brand UI', libraryName: 'Plugin UI' }],
        getVariablesInLibraryCollectionAsync: async () => keys.map((key) => ({ key, name: key, resolvedType: 'COLOR' })),
      } as unknown as PluginAPI['teamLibrary'],
    })
    const found = await findVariableCollection('Brand UI')
    expect(found?.variables).toHaveLength(60)
    expect(peak).toBeLessThanOrEqual(25)
  })

  it('surfaces a failed library request instead of pretending the collection is absent', async () => {
    libraryFile({ listing: async () => { throw new Error('offline') } })
    await expect(findVariableCollection('Brand UI')).rejects.toThrow('offline')
  })

  it('retries a library import that failed earlier in the run', async () => {
    let calls = 0
    libraryFile({ listing: async () => { calls += 1; if (calls === 1) throw new Error('offline'); return [{ key: 'coll-key', name: 'Brand UI', libraryName: 'Plugin UI' }] } })
    await expect(findVariableCollection('Brand UI')).rejects.toThrow('offline')
    expect(await findVariableCollection('Brand UI')).toMatchObject({ libraryName: 'Plugin UI' })
  })
})
