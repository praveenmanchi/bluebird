// Pure: version numbers for the next release, and the bump the change set calls for.
import type { Bump, Change } from './types'

export interface VersionOptionData {
  bump: Bump
  version: string
  hint: string
}

const HINT: Record<Bump, string> = {
  patch: 'Value tweaks and fixes',
  minor: 'New tokens or components',
  major: 'Removed or renamed — breaking',
}

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/

/** [major, minor, patch]; an unreadable version counts as 0.0.0. */
export function parseVersion(version: string | null | undefined): [number, number, number] {
  const m = VERSION.exec(version ?? '')
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
}

export function bumpVersion(current: string | null | undefined, bump: Bump): string {
  const [major, minor, patch] = parseVersion(current)
  if (bump === 'major') return `v${major + 1}.0.0`
  if (bump === 'minor') return `v${major}.${minor + 1}.0`
  return `v${major}.${minor}.${patch + 1}`
}

/** Breaking (removed / renamed) → major; anything added or deprecated → minor; value changes only → patch. A first release is always major (v1.0.0). */
export function suggestBump(changes: readonly Change[], firstRelease: boolean): Bump {
  if (firstRelease || changes.some((c) => c.breaking)) return 'major'
  if (changes.some((c) => c.kind === 'added' || c.kind === 'deprecated')) return 'minor'
  return 'patch'
}

/** Why the suggestion is what it is, in one sentence. */
export function suggestionReason(changes: readonly Change[], firstRelease: boolean, current: string | null): string {
  if (firstRelease) return 'Suggested because this is the first release of this file.'
  // A removal is the clearest reason to give; a renamed or dropped property comes next.
  const breaking = changes.find((c) => c.kind === 'removed') ?? changes.find((c) => c.breaking)
  if (breaking) {
    const [major] = parseVersion(current)
    const what = breaking.kind === 'removed' ? 'was removed' : breaking.detail.startsWith('Renamed') ? 'was renamed' : 'lost a component property'
    return `Suggested because ${breaking.name} ${what}. Sites pinned to v${major} keep working.`
  }
  const added = changes.find((c) => c.kind === 'added')
  if (added) return `Suggested because ${added.name} is new.`
  return 'Suggested because only values changed.'
}

export function versionOptions(current: string | null): VersionOptionData[] {
  return (['patch', 'minor', 'major'] as const).map((bump) => ({ bump, version: bumpVersion(current, bump), hint: HINT[bump] }))
}
