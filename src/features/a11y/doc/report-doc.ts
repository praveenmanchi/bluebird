// The Figma report's content (Figma "Figma report · Login screen", 40002664:28933),
// built from one scan and the findings the tab is currently showing. Pure: the
// sandbox only draws what this returns.
import type { ContrastIssue, NonTextIssue, ScanResult, TargetSizeIssue, UnmeasurableText } from '../messages'
import { criterionFor } from '../criteria'
import { NON_TEXT_MIN } from '../nontext'
import { rulesFor, type RuleId } from '../rules'
import { criteriaCount, standardLabel, understandingUrl, type StandardId } from '../standards'
import { CONFIDENCE_DETAIL, CONFIDENCE_LABEL, contrastConfidence, nonTextConfidence, targetConfidence, type Confidence } from '../confidence'
import { severityOf, summarizeScan, type FindingSeverity } from '../summary'
import { PLATFORM_TARGETS, requiredLabel, targetCitation, targetCriterion, unitOf, type Platform } from '../target'
import type { Badge, CheckRun, CheckType, DocFact, ManualCheck, ReportDoc, ReportIssue } from './types'

/** The findings on screen: the tab's rule and level filters already applied. */
export interface ReportView {
  issues: readonly ContrastIssue[]
  nonText: readonly NonTextIssue[]
  targets: readonly TargetSizeIssue[]
}

export interface ReportOptions {
  /** What was scanned: the selected frame's name, or the page. */
  title: string
  platform: Platform
  /** "10 Nov 2026". */
  scannedOn: string
}

const IMPACT: Readonly<Record<'contrast' | 'nontext' | 'target', string>> = {
  contrast: 'People with low vision, or reading on a bright screen, may not be able to read this text.',
  nontext: 'People with low vision may not see where this control starts and ends.',
  target: 'People with tremors or limited dexterity may miss this target or hit the one next to it.',
}

/** Up to this many layers are linked from one issue; the rest are counted. */
export const MAX_LINKS = 5

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
const layerLabel = (name: string, occurrences: number): string => (occurrences > 1 ? `${name} · ${plural(occurrences, 'layer')}` : name)
const pad = (n: number): string => String(n).padStart(2, '0')
const hex = (value: string): string => value.toUpperCase()

function contrastIssue(issue: ContrastIssue, standard: StandardId | undefined): Omit<ReportIssue, 'id'> {
  const c = criterionFor(issue)
  const ratio = `${issue.ratio.toFixed(2)}:1`
  const facts: DocFact[] = [
    { key: 'Layer', value: issue.text ? `${issue.name} · “${issue.text}”` : issue.name },
    ...(issue.fgToken ? [{ key: 'Token', value: issue.fgToken.name }] : []),
    { key: 'Measured', value: `${ratio} · ${hex(issue.foreground)} on ${hex(issue.background)}${issue.assumedBackground ? ' (background assumed white)' : ''}`, tone: severityOf({ kind: 'contrast', issue }) },
    { key: 'Required', value: `${c.needs}:1 for ${Math.round(issue.fontSize)}px text (${c.rating})` },
    ...decidedBy(contrastConfidence(issue)),
    { key: 'User impact', value: IMPACT.contrast },
  ]
  const fix = issue.fix
  return {
    type: 'contrast',
    criterion: `${c.code} ${c.title}`,
    principle: 'Perceivable',
    level: c.rating,
    severity: severityOf({ kind: 'contrast', issue }),
    layer: layerLabel(issue.name, issue.occurrences),
    measuredShort: `${ratio} · needs ${c.needs}:1`,
    facts,
    designFix: fix
      ? `Rebind the text to ${fix.tokenName}. It reaches ${fix.ratio.toFixed(2)}:1 in ${fix.mode}.`
      : `Darken the text or lighten what it sits on until it reaches ${c.needs}:1.`,
    codeFix: fix ? `color: ${hex(fix.hex)}; /* ${fix.tokenName} */` : `color: /* a colour reaching ${c.needs}:1 on ${hex(issue.background)} */;`,
    sample: { kind: 'contrast', foreground: issue.foreground, background: issue.background, text: issue.text || 'Aa' },
    nodeIds: issue.nodeIds.length ? issue.nodeIds : [issue.nodeId],
    reference: { label: `Understanding SC ${c.code} (W3C)`, url: understandingUrl(standard, c.code === '1.4.3' ? 'contrast-minimum' : 'contrast-enhanced') },
  }
}

function nonTextIssue(issue: NonTextIssue, standard: StandardId | undefined): Omit<ReportIssue, 'id'> {
  const ratio = `${issue.ratio.toFixed(2)}:1`
  return {
    type: 'nontext',
    criterion: '1.4.11 Non-text Contrast',
    principle: 'Perceivable',
    level: 'AA',
    severity: severityOf({ kind: 'nontext' }),
    layer: layerLabel(issue.name, issue.occurrences),
    measuredShort: `${ratio} · needs ${NON_TEXT_MIN}:1`,
    facts: [
      { key: 'Layer', value: layerLabel(issue.name, issue.occurrences) },
      { key: 'Measured', value: `${ratio} · ${hex(issue.foreground)} on ${hex(issue.background)}`, tone: 'serious' },
      { key: 'Required', value: `${NON_TEXT_MIN}:1 against what it sits on (AA)` },
      ...decidedBy(nonTextConfidence(issue)),
      { key: 'User impact', value: IMPACT.nontext },
    ],
    designFix: `Darken or lighten the stroke until it reaches ${NON_TEXT_MIN}:1 against ${hex(issue.background)}.`,
    codeFix: `border-color: /* a colour reaching ${NON_TEXT_MIN}:1 on ${hex(issue.background)} */;`,
    sample: { kind: 'nontext', foreground: issue.foreground, background: issue.background },
    nodeIds: issue.nodeIds.length ? issue.nodeIds : [issue.nodeId],
    reference: { label: 'Understanding SC 1.4.11 (W3C)', url: understandingUrl(standard, 'non-text-contrast') },
  }
}

/** The fix in the platform's own code: CSS, SwiftUI or Jetpack Compose. */
function targetCode(platform: Platform, required: number): string {
  if (platform === 'ios') return `.frame(minWidth: ${required}, minHeight: ${required})`
  if (platform === 'android') return `Modifier.sizeIn(minWidth = ${required}.dp, minHeight = ${required}.dp)`
  return `min-width: ${required}px;\nmin-height: ${required}px;`
}

function targetIssue(issue: TargetSizeIssue, standard: StandardId | undefined): Omit<ReportIssue, 'id'> {
  const cited = targetCitation(issue)
  const enhanced = cited.level === 'AAA'
  const unit = unitOf(issue)
  const platform = issue.platform ?? 'web'
  const size = `${issue.width} × ${issue.height} ${unit}`
  const why = issue.evidence === 'reaction' ? 'has a prototype interaction' : 'its name marks it as a control'
  return {
    type: 'target',
    criterion: cited.code ? `${cited.code} ${cited.title}` : `${cited.title} (${cited.label})`,
    principle: 'Operable',
    level: cited.level,
    severity: severityOf({ kind: 'target', width: issue.width, height: issue.height, standard: issue.standard }),
    layer: layerLabel(issue.name, issue.occurrences),
    measuredShort: `${issue.width} × ${issue.height} · needs ${issue.required} × ${issue.required}`,
    facts: [
      { key: 'Layer', value: `${layerLabel(issue.name, issue.occurrences)} · ${why}` },
      { key: 'Measured', value: size, tone: enhanced ? 'moderate' : 'serious' },
      { key: 'Required', value: requiredLabel(issue) },
      ...decidedBy(targetConfidence(issue)),
      { key: 'User impact', value: IMPACT.target },
    ],
    designFix: `Keep the artwork and grow the hit area to ${issue.required} × ${issue.required} ${unit}. Padding counts.`,
    codeFix: targetCode(platform, issue.required),
    sample: { kind: 'target', width: issue.width, height: issue.height, required: issue.required },
    nodeIds: issue.nodeIds.length ? issue.nodeIds : [issue.nodeId],
    reference: cited.code
      ? { label: `Understanding SC ${cited.code} (W3C)`, url: understandingUrl(standard, enhanced ? 'target-size-enhanced' : 'target-size-minimum') }
      : PLATFORM_REFERENCE[platform === 'android' ? 'android' : 'ios'],
  }
}

/** Where Apple and Google publish the tap-target minimum a platform-only finding cites. */
const PLATFORM_REFERENCE = {
  ios: { label: 'Apple Human Interface Guidelines: Accessibility', url: 'https://developer.apple.com/design/human-interface-guidelines/accessibility' },
  android: { label: 'Android Accessibility Help: Touch target size', url: 'https://support.google.com/accessibility/android/answer/7101858' },
} as const

/** Only said when it is worth saying: a measured finding needs no caveat, a guess does. */
const decidedBy = (confidence: Confidence): DocFact[] =>
  (confidence === 'measured' ? [] : [{ key: 'Decided by', value: `${CONFIDENCE_LABEL[confidence]} — ${CONFIDENCE_DETAIL[confidence]}`, tone: 'moderate' as const }])

const RULE_TYPE: Readonly<Record<RuleId, CheckType>> = { '1.4.3': 'contrast', '1.4.6': 'contrast', '1.4.11': 'nontext', '2.5.8': 'target', '2.5.5': 'target' }

/** Criteria no design-time scan can decide, listed so nobody reads the report as full coverage. */
const MANUAL_CHECKS: readonly Omit<CheckRun, 'result'>[] = [
  { type: 'contrast', criterion: '1.4.1 Use of Color', checked: 'Not automated', failing: '—' },
  { type: 'code', criterion: '1.1.1 Non-text Content', checked: 'Not automated', failing: '—' },
  { type: 'code', criterion: '2.4.7 Focus Visible', checked: 'Not automated', failing: '—' },
  { type: 'code', criterion: '4.1.2 Name, Role, Value', checked: 'Not automated', failing: '—' },
]

function checksRun(r: ScanResult, view: ReportView, platform: Platform): CheckRun[] {
  const failing: Readonly<Record<RuleId, number>> = {
    '1.4.3': view.issues.filter((i) => criterionFor(i).code === '1.4.3').length,
    '1.4.6': view.issues.filter((i) => criterionFor(i).code === '1.4.6').length,
    '1.4.11': view.nonText.length,
    '2.5.8': view.targets.filter((t) => targetCriterion(t) === '2.5.8').length,
    '2.5.5': view.targets.filter((t) => targetCriterion(t) === '2.5.5').length,
  }
  const checked: Readonly<Record<CheckType, string>> = {
    contrast: plural(r.textNodes, 'text layer'),
    nontext: 'Control borders',
    target: 'Interactive targets',
    code: 'Not automated',
  }
  const automated = rulesFor(platform, r.standard).map((rule): CheckRun => {
    const n = failing[rule.id]
    const result: Badge = n ? { tone: 'critical', label: 'Fail' } : { tone: 'pass', label: 'Pass' }
    return { type: RULE_TYPE[rule.id], criterion: rule.name.replace(/\((\w)/, (_, c: string) => `(${c.toUpperCase()}`), result, checked: checked[RULE_TYPE[rule.id]], failing: String(n) }
  })
  return [...automated, ...MANUAL_CHECKS.map((m) => ({ ...m, result: { tone: 'minor', label: 'Check by hand' } as Badge }))]
}

function manualChecks(unmeasurable: readonly UnmeasurableText[]): ManualCheck[] {
  return unmeasurable.map((u) => ({
    layer: u.name,
    why: `${u.reason.charAt(0).toUpperCase()}${u.reason.slice(1)}, so contrast can’t be measured.`,
    check: 'Compare the text against the darkest and lightest parts of what it sits on. It needs 4.5:1 everywhere.',
    nodeId: u.nodeId,
  }))
}

export function buildReportDoc(r: ScanResult, view: ReportView, options: ReportOptions): ReportDoc {
  const standard = r.standard
  const label = standardLabel(standard)
  const built = [
    ...view.issues.map((i) => contrastIssue(i, standard)),
    ...view.nonText.map((i) => nonTextIssue(i, standard)),
    ...view.targets.map((i) => targetIssue(i, standard)),
  ]
  const issues: ReportIssue[] = built.map((issue, index) => ({ ...issue, id: `A11Y-${pad(index + 1)}` }))
  const severity: Record<FindingSeverity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  const types: Record<CheckType, number> = { contrast: 0, nontext: 0, target: 0, code: 0 }
  for (const issue of issues) { severity[issue.severity] += 1; types[issue.type] += 1 }

  const summary = summarizeScan(r)
  const checks = checksRun(r, view, options.platform)
  const automatedRuns = checks.filter((c) => c.result.label !== 'Check by hand')
  const criteria = new Set(issues.map((i) => i.criterion)).size
  const manual = manualChecks(r.unmeasurable)
  const clean = issues.length === 0
  // Only an AA finding stops a screen meeting AA: text at 5:1 passes 1.4.3 and merely misses AAA.
  const openAA = issues.filter((i) => i.level === 'AA').length
  const openAAA = issues.length - openAA

  const counts = (['critical', 'serious', 'moderate', 'minor'] as const).filter((s) => severity[s]).map((s) => `${severity[s]} ${s}`)
  const verdictSummary = clean
    ? `No automated issues against ${label} AA. ${manual.length ? `${plural(manual.length, 'layer')} still ${manual.length === 1 ? 'needs' : 'need'} a manual check. ` : ''}Automated checks cover part of WCAG, so also review focus order, screen-reader names and motion by hand.`
    : `${plural(issues.length, 'issue')} to fix: ${counts.join(' and ')}. ${manual.length ? `${plural(manual.length, 'layer')} ${manual.length === 1 ? 'needs' : 'need'} a manual check. ` : ''}Automated checks cover part of WCAG, so also review focus order, screen-reader names and motion by hand.`

  return {
    kind: 'report',
    title: options.title,
    details: [
      { key: 'Standard', value: `${label} · Level AA${openAAA ? ' and AAA' : ''}` },
      { key: 'Platform', value: PLATFORM_TARGETS[options.platform].label },
      { key: 'Scope', value: `${r.scope === 'page' ? r.meta.page : options.title} · ${r.scanned.toLocaleString('en-GB')} layers` },
      { key: 'Scanned', value: options.scannedOn },
    ],
    verdict: clean
      ? { badge: { tone: 'pass', label: 'Automated checks pass' }, headline: `No automated issues against ${label} AA`, summary: verdictSummary }
      : openAA
        ? { badge: { tone: 'critical', label: 'Does not conform' }, headline: `Not yet ${label} AA`, summary: verdictSummary }
        : { badge: { tone: 'moderate', label: 'AA checks pass' }, headline: `No automated AA issues, ${plural(openAAA, 'AAA issue')} open`, summary: verdictSummary },
    totals: [
      { value: summary.score === null ? '—' : `${summary.score}%`, label: 'Components passing', note: summary.components.total ? `${summary.components.passing} of ${plural(summary.components.total, 'component')}` : 'No components in scope' },
      { value: String(issues.length), label: 'Issues to fix', note: issues.length ? `across ${plural(criteria, 'criterion', 'criteria')}` : 'none found' },
      { value: String(manual.length), label: 'Needs manual check', note: manual.length ? 'could not be measured' : 'nothing left to check' },
      { value: String(automatedRuns.length), label: 'Checks run', note: automatedRuns.map((c) => c.criterion.split(' ')[0]).join(' · ') },
    ],
    severity,
    types,
    issues,
    manual,
    checks,
    footer: `Generated by Bluebird Accessibility checker on ${options.scannedOn}. It decides ${automatedRuns.length} of the ${criteriaCount(standard)} success criteria in ${label}, so this report is not a conformance claim. Re-run the scan and export again to refresh it.`,
  }
}
