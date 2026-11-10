// The two documents Bluebird draws on the Figma canvas: the accessibility report
// (Figma "Figma report · Login screen", 40002664:28933) and the developer spec
// (Figma "Accessibility spec · Results", 40002672:29080). Plain data so the UI can
// build them, the sandbox can draw them, and tests can check them without Figma.
import type { FindingSeverity } from '../summary'

/** A severity badge, or the green "pass" badge the same component draws. */
export type BadgeTone = FindingSeverity | 'pass'

/** Which kind of check found the issue — the icon the report shows beside it. */
export type CheckType = 'contrast' | 'nontext' | 'target' | 'code'

export interface Badge { tone: BadgeTone; label: string }

/** A key/value cell in the "Scan details" row under the title. */
export interface DocDetail { key: string; value: string }

export interface DocFact { key: string; value: string; tone?: BadgeTone }

/** What the visual evidence panel draws for an issue. */
export type IssueSample =
  | { kind: 'contrast'; foreground: string; background: string; text: string }
  | { kind: 'nontext'; foreground: string; background: string }
  | { kind: 'target'; width: number; height: number; required: number }

export interface ReportIssue {
  /** Stable within one report: A11Y-01, A11Y-02… so each row can become a ticket. */
  id: string
  type: CheckType
  /** "1.4.3 Contrast (Minimum)". */
  criterion: string
  principle: 'Perceivable' | 'Operable'
  level: 'AA' | 'AAA'
  severity: FindingSeverity
  /** "Caption · 3 layers". */
  layer: string
  /** Short form for the issues table: "2.55:1 · needs 4.5:1". */
  measuredShort: string
  facts: readonly DocFact[]
  designFix: string
  codeFix: string
  sample: IssueSample
  /** Every affected layer; the sandbox links each one (Figma cannot link to a text node, so it uses the nearest frame). */
  nodeIds: readonly string[]
  reference: { label: string; url: string }
}

export interface ManualCheck { layer: string; why: string; check: string; nodeId: string }

export interface CheckRun { type: CheckType; criterion: string; result: Badge; checked: string; failing: string }

export interface DocTotal { value: string; label: string; note: string }

export interface ReportDoc {
  kind: 'report'
  title: string
  details: readonly DocDetail[]
  verdict: { badge: Badge; headline: string; summary: string }
  totals: readonly DocTotal[]
  severity: Readonly<Record<FindingSeverity, number>>
  types: Readonly<Record<CheckType, number>>
  issues: readonly ReportIssue[]
  manual: readonly ManualCheck[]
  checks: readonly CheckRun[]
  footer: string
}

/** The brand bar and footer line both documents share. The sandbox adds who created it. */
export interface DocBranding {
  documentType: string
  /** "10 Nov 2026, 14:32" in the viewer's locale. */
  createdAt: string
  /** "A11Y-R-20261110-1432". */
  documentId: string
  /** Figma file name. */
  file: string
  version: string
}

/** Colours the UI reads from its own CSS (the active brand's tokens), as hex. */
export interface DocTheme {
  page: string
  subtle: string
  border: string
  borderStrong: string
  title: string
  body: string
  meta: string
  accent: string
  severity: Readonly<Record<BadgeTone, { fg: string; bg: string }>>
  annotation: { focus: string; heading: string; landmark: string; on: string }
  banner: { bg: string; text: string }
  /** The active brand's logo as an SVG string (drawn white on the banner). Empty when unknown. */
  logoSvg: string
}
