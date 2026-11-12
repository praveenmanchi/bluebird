// WCAG 1.4.3 / 1.4.6 exemptions. Pure string logic: no Figma, fully unit tested.
//
// The standard exempts "incidental" text — inactive controls, and text that is
// part of a logo or brand name. Nothing else. Placeholder text is deliberately
// NOT exempt: it is real text a user has to read, and treating it as incidental
// is a common way scanners under-report.

export type Exemption = 'inactive' | 'logotype'

const INACTIVE = /(^|[^a-z])(disabled|inactive)([^a-z]|$)/i
const LOGOTYPE = /(^|[^a-z])(logo|logotype|wordmark|brandmark)([^a-z]|$)/i

const OFF = /^(false|no|off|0|none)$/i

/**
 * "State=Disabled" and "Disabled=True" are inactive; "Disabled=False" is the
 * enabled control and must be checked. A property named for the inactive state
 * only counts when its value is not a negative.
 */
function variantSaysInactive(entry: string): boolean {
  const at = entry.indexOf('=')
  if (at < 0) return INACTIVE.test(entry)
  const key = entry.slice(0, at)
  const value = entry.slice(at + 1).trim()
  if (INACTIVE.test(value)) return true
  return INACTIVE.test(key) && !OFF.test(value)
}

/**
 * Decide whether a finding is incidental, given the node's own name, its
 * ancestors' names, and any variant property values in the chain
 * (a Figma "State=Disabled" variant is the usual way a disabled control is drawn).
 */
export function exemptionFor(
  names: readonly string[],
  variantValues: readonly string[] = [],
): Exemption | null {
  for (const value of variantValues) {
    if (variantSaysInactive(value)) return 'inactive'
  }
  for (const name of names) {
    if (INACTIVE.test(name)) return 'inactive'
    if (LOGOTYPE.test(name)) return 'logotype'
  }
  return null
}

export const EXEMPTION_REASON: Record<Exemption, string> = {
  inactive: 'Inactive control — WCAG 1.4.3 exempts text in a disabled component.',
  logotype: 'Logotype — WCAG 1.4.3 exempts text that is part of a logo or brand name.',
}
