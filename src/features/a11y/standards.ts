// The WCAG versions the tab can check against. Pure data: no Figma, no UI.
//
// Every 2.x version is a strict superset of the one before, so a criterion is
// "in" a standard when the standard is at least the version that introduced
// it. WCAG 3.0 is deliberately absent: it is still a working draft with a
// different conformance model (outcomes, not success criteria), so nothing
// here could honestly claim to check against it.

export type StandardId = 'wcag20' | 'wcag21' | 'wcag22'

export interface Standard {
  id: StandardId
  label: string
  /** The W3C path segment its Quick Reference and Understanding pages live under. */
  path: 'WCAG20' | 'WCAG21' | 'WCAG22'
}

/** Newest first, as the Standard dropdown lists them (Recommendations of 2023, 2018 and 2008). */
export const STANDARDS: readonly Standard[] = [
  { id: 'wcag22', label: 'WCAG 2.2', path: 'WCAG22' },
  { id: 'wcag21', label: 'WCAG 2.1', path: 'WCAG21' },
  { id: 'wcag20', label: 'WCAG 2.0', path: 'WCAG20' },
]

export const STANDARD_IDS = STANDARDS.map((s) => s.id) as [StandardId, ...StandardId[]]

export const DEFAULT_STANDARD: StandardId = 'wcag22'

/** Version order, for "does this standard contain a criterion added in that one". */
const RANK: Readonly<Record<StandardId, number>> = { wcag20: 0, wcag21: 1, wcag22: 2 }

export function standardOf(id: StandardId | undefined = DEFAULT_STANDARD): Standard {
  return STANDARDS.find((s) => s.id === id) ?? STANDARDS[0]!
}

export const standardLabel = (id?: StandardId): string => standardOf(id).label

/** True when `standard` contains the criteria introduced in `since` (2.2 contains 2.1's, not the reverse). */
export function includes(standard: StandardId | undefined, since: StandardId): boolean {
  return RANK[standard ?? DEFAULT_STANDARD] >= RANK[since]
}

/** The W3C's "How to Meet WCAG" Quick Reference for that version (the "Check rules" link). */
export const quickrefUrl = (id?: StandardId): string => `https://www.w3.org/WAI/${standardOf(id).path}/quickref/`

/**
 * The Understanding page for a criterion in that version. The page names are stable
 * across versions except Target Size: 2.1 had only the AAA criterion and named its
 * page plainly; 2.2 added the AA minimum and renamed the AAA one "enhanced".
 */
export function understandingUrl(id: StandardId | undefined, slug: string): string {
  const s = standardOf(id)
  const page = s.id === 'wcag21' && slug === 'target-size-enhanced' ? 'target-size' : slug
  return `https://www.w3.org/WAI/${s.path}/Understanding/${page}.html`
}
