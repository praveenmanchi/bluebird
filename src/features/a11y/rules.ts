// The WCAG rules this tab checks, as listed in Figma "Accessibility · Ready to
// scan" (What we check). Each finding belongs to exactly one rule, so unticking a
// rule hides its findings. Pure: no Figma, no UI.
import type { RatingLevel } from '@shared/ui'
import type { ContrastIssue, TargetSizeIssue } from './messages'
import { DEFAULT_STANDARD, includes, type StandardId } from './standards'
import { PLATFORM_TARGETS, TARGET_ENHANCED_SINCE, TARGET_MINIMUM_SINCE, targetCriterion, type Platform } from './target'

export type RuleId = '1.4.3' | '1.4.6' | '1.4.11' | '2.5.8' | '2.5.5'

export interface Rule {
  id: RuleId
  name: string
  description: string
  level: RatingLevel
  /** The WCAG version that introduced it; every later version keeps it. */
  since: StandardId
}

export const RULES: readonly Rule[] = [
  { id: '1.4.3', name: '1.4.3 Contrast (minimum)', description: 'Text 4.5:1, large text 3:1, in every brand mode', level: 'AA', since: 'wcag20' },
  { id: '1.4.6', name: '1.4.6 Contrast (enhanced)', description: 'Text 7:1, large text 4.5:1', level: 'AAA', since: 'wcag20' },
  { id: '1.4.11', name: '1.4.11 Non-text contrast', description: 'Borders and icons that identify a control, 3:1', level: 'AA', since: 'wcag21' },
  { id: '2.5.8', name: '2.5.8 Target size (minimum)', description: '24×24 hit area, or enough space around it', level: 'AA', since: TARGET_MINIMUM_SINCE },
  { id: '2.5.5', name: '2.5.5 Target size (enhanced)', description: '44×44 hit area', level: 'AAA', since: TARGET_ENHANCED_SINCE },
]

/** The rule a criterion id belongs to. */
export const ruleOf = (id: RuleId): Rule => RULES.find((r) => r.id === id)!

/** Whether a standard has the rule at all (1.4.11 is not in 2.0; 2.5.8 is only in 2.2). */
export const ruleIn = (id: RuleId, standard: StandardId = DEFAULT_STANDARD): boolean => includes(standard, ruleOf(id).since)

export type RuleSet = Readonly<Record<RuleId, boolean>>

export const ALL_RULES: RuleSet = { '1.4.3': true, '1.4.6': true, '1.4.11': true, '2.5.8': true, '2.5.5': true }

/** A contrast finding fails 1.4.3 outright, else only the enhanced 1.4.6 bar. */
export const contrastRule = (issue: Pick<ContrastIssue, 'level'>): RuleId => (issue.level === 'fail' ? '1.4.3' : '1.4.6')

/** A target finding under 24 fails 2.5.8 on any platform; otherwise it misses the larger bar (2.5.5 / the platform's). Before 2.2 it is always 2.5.5. */
export const targetRule = (issue: Pick<TargetSizeIssue, 'width' | 'height' | 'standard'>): RuleId => targetCriterion(issue)

/**
 * The list for a platform and standard: a standard only lists the rules it has, and on
 * iOS / Android the enhanced target row is that platform's own minimum, which applies
 * whatever WCAG version is chosen (it is Apple's or Google's bar, not the W3C's).
 */
export function rulesFor(platform: Platform, standard: StandardId = DEFAULT_STANDARD): readonly Rule[] {
  const listed = RULES.filter((r) => ruleIn(r.id, standard) || (r.id === '2.5.5' && platform !== 'web'))
  if (platform === 'web') return listed
  const p = PLATFORM_TARGETS[platform]
  return listed.map((r) => (r.id === '2.5.5'
    ? { ...r, name: `${p.label} target size (${p.source})`, description: `${p.min}×${p.min} ${p.unit} tap target` }
    : r))
}

export const enabledCount = (rules: RuleSet, list: readonly Rule[] = RULES): number => list.filter((r) => rules[r.id]).length
