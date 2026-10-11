// Conformance report. Pure data shaping and string building: no Figma, no DOM.
//
// Under EAA enforcement a team has to *demonstrate* conformance, not intend it.
// That means an artifact somebody outside the design tool can read: what was
// scanned, when, against which criteria, what failed, and — just as important —
// what was skipped and why, so the report cannot be mistaken for full coverage.
import { NON_TEXT_MIN } from './nontext'
import type { ScanResult } from './messages'
import { requiredLabel, targetCriterion, unitOf } from './target'

export interface ReportMeta {
  /** Figma file name. */
  file: string
  /** Page the scan ran on. */
  page: string
  /** Brand mode the values were read in. */
  brand: string
  /** ISO timestamp. Passed in so the builder stays pure and testable. */
  generatedAt: string
}

export interface ReportFinding {
  criterion: string
  title: string
  level: 'AA' | 'AAA'
  layer: string
  nodeId: string
  occurrences: number
  actual: string
  required: string
  fix?: string
}

export interface Report {
  tool: 'Bluebird'
  standard: 'WCAG 2.2'
  meta: ReportMeta
  /** Exactly what this scan can and cannot see. */
  coverage: {
    automated: readonly string[]
    notCovered: string
  }
  summary: {
    findings: number
    contrast: number
    nonText: number
    targetSize: number
    layersScanned: number
    textLayers: number
    exempt: number
    unmeasurable: number
    instancesSkipped: number
    durationMs: number
  }
  findings: readonly ReportFinding[]
  /** Layers deliberately excluded, so the numbers can be audited. */
  excluded: {
    unmeasurable: readonly { nodeId: string; layer: string; reason: string }[]
    exemptCount: number
  }
}

const AUTOMATED = [
  '1.4.3 Contrast (Minimum)',
  '1.4.6 Contrast (Enhanced)',
  '1.4.11 Non-text Contrast',
  '2.5.8 Target Size (Minimum)',
  '2.5.5 Target Size (Enhanced)',
] as const

const NOT_COVERED =
  'Automated design-time checks only. Roughly 70% of WCAG 2.2 cannot be decided from a '
  + 'Figma tree — focus order, keyboard operation, alt text quality, reading order, timing and '
  + 'motion all need human review. A clean report is not a conformance claim.'

export function buildReport(result: ScanResult, meta: ReportMeta): Report {
  const findings: ReportFinding[] = []

  for (const issue of result.issues) {
    const large = issue.fontSize >= 24 || (issue.fontSize >= 18.66 && issue.isBold)
    const failsAA = issue.level === 'fail'
    findings.push({
      criterion: failsAA ? '1.4.3' : '1.4.6',
      title: failsAA ? 'Contrast (Minimum)' : 'Contrast (Enhanced)',
      level: failsAA ? 'AA' : 'AAA',
      layer: issue.name,
      nodeId: issue.nodeId,
      occurrences: issue.occurrences,
      actual: `${issue.ratio.toFixed(2)}:1`,
      required: `${failsAA ? (large ? 3 : 4.5) : (large ? 4.5 : 7)}:1`,
      fix: issue.fix ? `Rebind to ${issue.fix.tokenName} (${issue.fix.ratio.toFixed(2)}:1)` : undefined,
    })
  }

  for (const issue of result.nonText) {
    findings.push({
      criterion: '1.4.11',
      title: 'Non-text Contrast',
      level: 'AA',
      layer: issue.name,
      nodeId: issue.nodeId,
      occurrences: issue.occurrences,
      actual: `${issue.ratio.toFixed(2)}:1`,
      required: `${NON_TEXT_MIN}:1`,
    })
  }

  for (const issue of result.targets) {
    const enhanced = targetCriterion(issue) === '2.5.5'
    findings.push({
      criterion: enhanced ? '2.5.5' : '2.5.8',
      title: enhanced ? 'Target Size (Enhanced)' : 'Target Size (Minimum)',
      level: enhanced ? 'AAA' : 'AA',
      layer: issue.name,
      nodeId: issue.nodeId,
      occurrences: issue.occurrences,
      actual: `${issue.width} × ${issue.height} ${unitOf(issue)}`,
      required: requiredLabel(issue),
      fix: 'Grow the hit area to the minimum; padding counts.',
    })
  }

  return {
    tool: 'Bluebird',
    standard: 'WCAG 2.2',
    meta,
    coverage: { automated: AUTOMATED, notCovered: NOT_COVERED },
    summary: {
      findings: findings.length,
      contrast: result.issues.length,
      nonText: result.nonText.length,
      targetSize: result.targets.length,
      layersScanned: result.scanned,
      textLayers: result.textNodes,
      exempt: result.exempt,
      unmeasurable: result.unmeasurable.length,
      instancesSkipped: result.instancesSkipped,
      durationMs: result.durationMs,
    },
    findings,
    excluded: {
      unmeasurable: result.unmeasurable.map((u) => ({ nodeId: u.nodeId, layer: u.name, reason: u.reason })),
      exemptCount: result.exempt,
    },
  }
}

const escapePipes = (value: string) => value.replace(/\|/g, '\\|')

/** The same report as Markdown, for pasting into a ticket or an audit pack. */
export function reportToMarkdown(report: Report): string {
  const { meta, summary } = report
  const lines: string[] = [
    `# Accessibility report — ${meta.file}`,
    '',
    `- **Page:** ${meta.page}`,
    `- **Brand mode:** ${meta.brand}`,
    `- **Standard:** ${report.standard}`,
    `- **Generated:** ${meta.generatedAt}`,
    `- **Tool:** ${report.tool}`,
    '',
    '## Summary',
    '',
    `${summary.findings} finding${summary.findings === 1 ? '' : 's'} across ${summary.layersScanned.toLocaleString()} layers `
      + `(${summary.contrast} contrast, ${summary.nonText} non-text, ${summary.targetSize} target size).`,
    '',
  ]

  if (report.findings.length) {
    lines.push('## Findings', '', '| SC | Criterion | Level | Layer | Layers | Measured | Required | Suggested fix |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const f of report.findings) {
      lines.push(
        `| ${f.criterion} | ${escapePipes(f.title)} | ${f.level} | ${escapePipes(f.layer)} | ${f.occurrences} `
        + `| ${f.actual} | ${f.required} | ${f.fix ? escapePipes(f.fix) : '—'} |`,
      )
    }
    lines.push('')
  } else {
    lines.push('No automated findings.', '')
  }

  lines.push('## Excluded from the counts', '')
  lines.push(`- ${report.excluded.exemptCount} layer${report.excluded.exemptCount === 1 ? '' : 's'} exempt under WCAG 1.4.3 (inactive controls, logotypes).`)
  lines.push(`- ${summary.instancesSkipped} repeated component instance${summary.instancesSkipped === 1 ? '' : 's'} scanned once.`)
  if (report.excluded.unmeasurable.length) {
    lines.push('', '### Could not be measured', '')
    for (const u of report.excluded.unmeasurable) lines.push(`- **${u.layer}** — ${u.reason}`)
  }

  lines.push('', '## Coverage', '', 'Checked automatically:', '')
  for (const c of report.coverage.automated) lines.push(`- ${c}`)
  lines.push('', report.coverage.notCovered, '')

  return lines.join('\n')
}
