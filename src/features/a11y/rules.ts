// The WCAG 2.2 rules this tab checks, as listed in Figma "Accessibility · Ready to
// scan" (What we check). Each finding belongs to exactly one rule, so unticking a
// rule hides its findings. Pure: no Figma, no UI.
import type { RatingLevel } from '@shared/ui'
import type { ContrastIssue, TargetSizeIssue } from './messages'
import { PLATFORM_TARGETS, targetCriterion, type Platform } from './target'

export type RuleId = '1.4.3' | '1.4.6' | '1.4.11' | '2.5.8' | '2.5.5'

export interface Rule { id: RuleId; name: string; description: string; level: RatingLevel }

export const RULES: readonly Rule[] = [
  { id: '1.4.3', name: '1.4.3 Contrast (minimum)', description: 'Text 4.5:1, large text 3:1, in every brand mode', level: 'AA' },
  { id: '1.4.6', name: '1.4.6 Contrast (enhanced)', description: 'Text 7:1, large text 4.5:1', level: 'AAA' },
  { id: '1.4.11', name: '1.4.11 Non-text contrast', description: 'Borders and icons that identify a control, 3:1', level: 'AA' },
  { id: '2.5.8', name: '2.5.8 Target size (minimum)', description: '24×24 hit area, or enough space around it', level: 'AA' },
  { id: '2.5.5', name: '2.5.5 Target size (enhanced)', description: '44×44 hit area', level: 'AAA' },
]

export type RuleSet = Readonly<Record<RuleId, boolean>>

export const ALL_RULES: RuleSet = { '1.4.3': true, '1.4.6': true, '1.4.11': true, '2.5.8': true, '2.5.5': true }

/** The W3C's WCAG 2.2 Quick Reference (the "Check rules" link). */
export const RULES_URL = 'https://www.w3.org/WAI/WCAG22/quickref/'

/** A contrast finding fails 1.4.3 outright, else only the enhanced 1.4.6 bar. */
export const contrastRule = (issue: Pick<ContrastIssue, 'level'>): RuleId => (issue.level === 'fail' ? '1.4.3' : '1.4.6')

/** A target finding under 24 fails 2.5.8 on any platform; otherwise it misses the larger bar (2.5.5 / the platform's). */
export const targetRule = (issue: Pick<TargetSizeIssue, 'width' | 'height'>): RuleId => targetCriterion(issue)

/** The list for a platform: on iOS / Android the enhanced target row is that platform's own minimum. */
export function rulesFor(platform: Platform): readonly Rule[] {
  if (platform === 'web') return RULES
  const p = PLATFORM_TARGETS[platform]
  return RULES.map((r) => (r.id === '2.5.5'
    ? { ...r, name: `${p.label} target size (${p.source})`, description: `${p.min}×${p.min} ${p.unit} tap target` }
    : r))
}

export const enabledCount = (rules: RuleSet): number => RULES.filter((r) => rules[r.id]).length
