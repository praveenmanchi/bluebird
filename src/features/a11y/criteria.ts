// Which WCAG criterion a finding is reported against. Pure: shared by the cards,
// the filters and the documents Bluebird draws on the canvas.
import type { ContrastIssue } from './messages'
import { isLargeText } from './contrast'

export interface ContrastCriterion { code: '1.4.3' | '1.4.6'; title: string; rating: 'AA' | 'AAA'; needs: number }

/** `fail` breaks 1.4.3 (AA); everything else below AAA breaks 1.4.6. */
export function criterionFor(issue: Pick<ContrastIssue, 'level' | 'fontSize' | 'isBold'>): ContrastCriterion {
  const large = isLargeText(issue.fontSize, issue.isBold)
  if (issue.level === 'fail') return { code: '1.4.3', title: 'Contrast (Minimum)', rating: 'AA', needs: large ? 3 : 4.5 }
  return { code: '1.4.6', title: 'Contrast (Enhanced)', rating: 'AAA', needs: large ? 4.5 : 7 }
}
