// Dev-facing annotation text. Pure string building: no Figma, no DOM.
//
// Plugin-drawn annotation overlays are invisible in Dev Mode by default, which
// is where developers actually read a spec. These strings go into Figma's own
// `node.annotations`, so they surface in the Dev Mode inspector next to the
// layer they describe.
import type { ContrastIssue, NonTextIssue, TargetSizeIssue } from './messages'
import { NON_TEXT_MIN } from './nontext'
import { PLATFORM_TARGETS, targetCriterion, unitOf } from './target'

/** One annotation: a title line Dev Mode shows, and the body under it. */
export interface AnnotationText {
  label: string
}

export function annotationForContrast(issue: ContrastIssue, code: string, needed: number): AnnotationText {
  const parts = [
    `WCAG ${code} — ${issue.ratio.toFixed(2)}:1, needs ${needed}:1.`,
    `${issue.foreground.toUpperCase()} on ${issue.background.toUpperCase()}.`,
  ]
  if (issue.fgToken) parts.push(`Bound to ${issue.fgToken.name} (${issue.fgToken.mode}).`)
  if (issue.fix) parts.push(`Fix: use ${issue.fix.tokenName} — ${issue.fix.ratio.toFixed(2)}:1.`)
  const failing = issue.brandModes?.filter((m) => !m.pass).map((m) => m.brand) ?? []
  if (failing.length) parts.push(`Also fails in: ${failing.join(', ')}.`)
  return { label: parts.join(' ') }
}

export function annotationForNonText(issue: NonTextIssue): AnnotationText {
  return {
    label: `WCAG 1.4.11 — border measures ${issue.ratio.toFixed(2)}:1, needs ${NON_TEXT_MIN}:1. `
      + `${issue.foreground.toUpperCase()} on ${issue.background.toUpperCase()}.`,
  }
}

export function annotationForTarget(issue: TargetSizeIssue): AnnotationText {
  const code = targetCriterion(issue)
  return {
    label: `WCAG ${code} — target is ${issue.width}×${issue.height}${unitOf(issue)}, needs ${issue.required}×${issue.required}${unitOf(issue)}${issue.platform && issue.platform !== 'web' ? ` (${PLATFORM_TARGETS[issue.platform].source})` : ''}. `
      + `Grow the hit area, padding is enough.`,
  }
}
