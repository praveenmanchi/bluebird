// The Publish tab's data model: what an extract reads from the Figma file
// (a Snapshot), what changed since the last release (Change), and the release
// itself. Pure types — shared by the sandbox, the mock and the UI.

export type VariableValueType = 'color' | 'number' | 'string' | 'boolean'

/** One local variable with its value in every mode of its collection, formatted for display. */
export interface VariableEntry {
  id: string
  name: string
  collection: string
  type: VariableValueType
  /** Mode name → display value (#RRGGBB, number, text, true/false, or "→ other/variable" for an alias). */
  values: Readonly<Record<string, string>>
  description: string
}

/** One local component set (or standalone component). */
export interface ComponentEntry {
  /** Component key when the file has been published, else the node id. Stable across renames. */
  id: string
  name: string
  page: string
  variants: number
  /** Component property names (variant axes included), sorted. */
  properties: readonly string[]
  description: string
  /** Ids of the variables bound anywhere inside the component. */
  usesVariables: readonly string[]
}

export interface Snapshot {
  takenAt: string
  variables: readonly VariableEntry[]
  components: readonly ComponentEntry[]
}

export type ChangeKind = 'added' | 'modified' | 'removed' | 'deprecated'
export type ChangeSubject = 'variable' | 'component'
export type ChangePreview = 'color' | 'number' | 'component'

/** A variable's value in one mode, old vs new. */
export interface ModeValue {
  mode: string
  state: 'changed' | 'unchanged'
  kind: 'color' | 'number'
  old?: string
  new?: string
  /** The value when unchanged. */
  value?: string
}

export interface Change {
  /** `variable:<id>` or `component:<id>`. */
  id: string
  subject: ChangeSubject
  kind: ChangeKind
  preview: ChangePreview
  name: string
  /** One line for the change row, e.g. "#0C8CE9 → #0560A3 · 3 of 5 brands". */
  detail: string
  /** Removals and renames break consumers; they force a major version. */
  breaking: boolean
  /** Colour preview for colour variables (the new value, or the old one when removed). */
  swatch?: string
  modeValues: readonly ModeValue[]
  /** Names of the components that use this variable. */
  usedIn: readonly string[]
  /** Where it lives, e.g. "Brand UI › button/bg/primary". */
  source: string
}

export type Bump = 'patch' | 'minor' | 'major'

/** The release a publish records, and the next extract compares against. */
export interface ReleaseRecord {
  version: string
  title: string
  publishedAt: string
  changes: number
  snapshot: Snapshot
}

/** A past release as the history list shows it. */
export interface ReleaseSummary {
  version: string
  title: string
  publishedAt: string
  changes: number
}

/**
 * What a published file carries forward: the release history (newest first) and the
 * snapshot the next diff compares against. Stored in the Figma file (document plugin
 * data) and, like Tokens Studio keeps its remote data, committed to the repository as
 * `.bluebird/releases.json`, so a copied file or a lost plugin-data entry can recover
 * its baseline from GitHub.
 */
export interface ReleaseStore {
  releases: readonly ReleaseSummary[]
  baseline: Snapshot
}
