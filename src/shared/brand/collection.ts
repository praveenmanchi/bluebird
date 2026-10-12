// Runs in the Figma sandbox. Finds a variable collection by NAME: the open file's own copy
// first, then the file's enabled libraries. A product file that uses the design system sees
// Brand UI only through its library, so a local-only lookup fell back to config tokens there.

export interface FoundCollection {
  readonly name: string
  readonly modes: readonly { readonly modeId: string; readonly name: string }[]
  readonly variables: readonly Variable[]
  /** The library it came from; absent when the collection is local to the open file. */
  readonly libraryName?: string
}

/**
 * Library imports are cached per `figma` instance, i.e. once per plugin run (and per mock in
 * tests). A failed import is dropped from the cache so the next call retries.
 */
const libraryCache = new WeakMap<PluginAPI, Map<string, Promise<FoundCollection | null>>>()

export async function findVariableCollection(name: string): Promise<FoundCollection | null> {
  const local = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === name)
  if (local) {
    const variables = await Promise.all(local.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)))
    return { name, modes: local.modes, variables: variables.filter((v): v is Variable => v !== null) }
  }
  return fromLibraryCached(name)
}

function fromLibraryCached(name: string): Promise<FoundCollection | null> {
  let byName = libraryCache.get(figma)
  if (!byName) libraryCache.set(figma, (byName = new Map()))
  const cached = byName.get(name)
  if (cached) return cached
  const pending = fromLibrary(name)
  byName.set(name, pending)
  pending.catch(() => byName.delete(name))
  return pending
}

/** The teamLibrary API, or null when the plugin lacks the `teamlibrary` permission. */
function teamLibrary(): PluginAPI['teamLibrary'] | null {
  try {
    return figma.teamLibrary ?? null
  } catch {
    return null
  }
}

/**
 * Imports every variable of the named library collection into the open file. That is how the
 * Plugin API exposes library values: the import adds remote references (no layers change), and
 * a file already using the library gets back the variables it holds, so ids match the
 * `boundVariables` on its layers.
 */
async function fromLibrary(name: string): Promise<FoundCollection | null> {
  const library = teamLibrary()
  if (!library) return null
  const matches = (await library.getAvailableLibraryVariableCollectionsAsync()).filter((c) => c.name === name)
  if (matches.length > 1) {
    throw new Error(`"${name}" is in several enabled libraries (${matches.map((m) => m.libraryName).join(', ')}) — disable all but one`)
  }
  const match = matches[0]
  if (!match) return null
  const listed = await library.getVariablesInLibraryCollectionAsync(match.key)
  const variables = await importInBatches(listed.map((v) => v.key))
  const first = variables[0]
  if (!first) return null
  const collection = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId)
  if (!collection) return null
  return { name, modes: collection.modes, variables, libraryName: match.libraryName }
}

/** Brand UI holds ~900 variables; a few dozen requests at a time keeps Figma from throttling. */
const IMPORT_BATCH = 25

/** All-or-nothing: a half-imported brand would theme the UI from a mix of Figma and fallback. */
async function importInBatches(keys: readonly string[]): Promise<Variable[]> {
  const imported: Variable[] = []
  for (let i = 0; i < keys.length; i += IMPORT_BATCH) {
    const batch = keys.slice(i, i + IMPORT_BATCH)
    imported.push(...(await Promise.all(batch.map((key) => figma.variables.importVariableByKeyAsync(key)))))
  }
  return imported
}
