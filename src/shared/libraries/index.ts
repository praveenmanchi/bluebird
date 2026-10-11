// Dual File Mode: the library files (variables, components) a design draws on,
// read from the Figma REST API and shared by the tabs that need that context.
export { LIBRARIES_MSG, loadRequestSchema } from './types'
export type {
  LibraryComponent, LibraryCollection, LibraryFile, LibraryIndex, LibraryLoadResult, LibraryRole, LibraryVariable,
  LoadRequest, ModeValue, VariableType,
} from './types'
export { createLibrariesHandlers } from './handlers'
export type { LibrariesDeps } from './handlers'
export { describeFile, filesFromSettings, loadLibraries, rolesOf, settingsProblem, testDualFile } from './load'
export type { FileSpec } from './load'
export { FIGMA_API, LibraryError } from './rest'
export type { HttpFetch } from './rest'
export { impliedType, queryTerms, searchComponents, searchVariables } from './search'
export type { Hits } from './search'
export { figmaUrl } from './url'
export { ensureLibraryState, libraryPill, libraryState, loadLibraryState, LOAD_TIMEOUT_MS } from './status'
export type { LibraryPill, LibraryState } from './status'
