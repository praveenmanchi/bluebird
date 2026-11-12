// The Publish tab's data model: what an extract reads from the Figma file
// (a Snapshot), what changed since the last release (Change), and the release
// itself. Pure types — shared by the sandbox, the mock and the UI.

export type {
  VariableValueType, VariableEntry, ComponentEntry, Snapshot, ChangeKind, ChangeSubject, ChangePreview, ModeValue, Change,
} from '@shared/design/types'
import type { Snapshot } from '@shared/design/types'

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
