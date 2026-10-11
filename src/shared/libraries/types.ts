// What Dual File Mode reads from the library files: the variables and published
// components a designer's file may be using from elsewhere. Built in the sandbox
// from the Figma REST API and sent to the UI, so it carries no token.
import * as z from 'zod/mini'

export const LIBRARIES_MSG = {
  /** Loads (or returns the cached) library index for the saved Dual File settings. */
  load: 'libraries:load',
} as const

export const loadRequestSchema = z.optional(z.object({ refresh: z.optional(z.boolean()) }))
export type LoadRequest = z.infer<typeof loadRequestSchema>

export type VariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'

/** A variable's value in one mode. `value` is display text: #RRGGBB(AA), a number, a string or true/false. */
export interface ModeValue {
  mode: string
  value: string
  /** The variable this mode aliases (first hop), when it is an alias. */
  aliasOf?: string
}

export interface LibraryVariable {
  id: string
  /** Matches the Plugin API's Variable.key of the same variable imported into another file. */
  key: string
  name: string
  collection: string
  type: VariableType
  description: string
  scopes: readonly string[]
  values: readonly ModeValue[]
  fileKey: string
}

export interface LibraryComponent {
  /** The set's key for a component set, else the component's own key. */
  key: string
  nodeId: string
  name: string
  kind: 'set' | 'component'
  description: string
  /** "Page › Frame" where it sits in the library file. */
  location: string
  /** Number of variants (1 for a plain component). */
  variants: number
  /** Its own key plus every variant's: an instance's main component key is one of these. */
  keys: readonly string[]
  fileKey: string
}

export interface LibraryCollection { name: string; modes: readonly string[]; variables: number; fileKey: string }

export type LibraryRole = 'variables' | 'components'

/** One Dual File slot after loading. A failed file keeps its slot with the reason. */
export interface LibraryFile {
  slot: 1 | 2
  fileKey: string
  /** The file's name in Figma, or its key when the name couldn't be read. */
  name: string
  roles: readonly LibraryRole[]
  variables: number
  components: number
  collections: readonly string[]
  /** Set when the file couldn't be read; the reason is a sentence for the designer. */
  error?: string
  /** Read but partly: e.g. components came back empty because nothing is published. */
  warning?: string
}

export interface LibraryIndex {
  files: readonly LibraryFile[]
  variables: readonly LibraryVariable[]
  components: readonly LibraryComponent[]
  collections: readonly LibraryCollection[]
  loadedAt: number
}

export type LibraryLoadResult =
  | { status: 'ready'; index: LibraryIndex }
  | { status: 'not-configured'; reason: 'disabled' | 'empty'; message: string }
