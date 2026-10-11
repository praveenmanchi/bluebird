// The Scan Summary dashboard's numbers, derived from one ScanResult. Pure: the
// sandbox measures, this only counts — so it is safe to unit test and to re-run
// when the level filter changes.
import type { ComponentLevel, ContrastIssue, ScanResult } from './messages'
import { targetCriterion } from './target'

export type FindingSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

export type SeverityInput =
  | { kind: 'contrast'; issue: Pick<ContrastIssue, 'level' | 'assumedBackground'> }
  | { kind: 'nontext' }
  | { kind: 'target'; width: number; height: number }

/** The severity each card already shows, so the dashboard and the cards agree. */
export function severityOf(f: SeverityInput): FindingSeverity {
  switch (f.kind) {
    case 'contrast': return f.issue.assumedBackground ? 'moderate' : f.issue.level === 'fail' ? 'critical' : 'serious'
    case 'nontext': return 'serious'
    case 'target': return targetCriterion(f) === '2.5.5' ? 'moderate' : 'serious'
  }
}

export interface LevelTally { total: number; passing: number }

export interface ScanSummaryData {
  /** Share of components with no finding in their own layers, 0–100; null when none were scanned. */
  score: number | null
  components: { total: number; passing: number; failing: number }
  levels: Record<ComponentLevel, LevelTally>
  frames: LevelTally
  findings: number
  failAA: number
  principles: { perceivable: number; operable: number; understandable: number; robust: number }
  severity: Record<FindingSeverity, number>
  /** Contrast findings failing in each brand mode, in the order the scan reported the brands. */
  brands: readonly { brand: string; failing: number }[]
}

export function summarizeScan(r: ScanResult): ScanSummaryData {
  const components = r.inventory?.components ?? []
  const frames = r.inventory?.frames ?? []
  const passing = components.filter((c) => !c.failing).length

  const levels: Record<ComponentLevel, LevelTally> = { atom: { total: 0, passing: 0 }, molecule: { total: 0, passing: 0 }, organism: { total: 0, passing: 0 } }
  for (const c of components) {
    levels[c.level].total += 1
    if (!c.failing) levels[c.level].passing += 1
  }

  const severity: Record<FindingSeverity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const issue of r.issues) severity[severityOf({ kind: 'contrast', issue })] += 1
  for (const _ of r.nonText) severity.serious += 1
  for (const t of r.targets) severity[severityOf({ kind: 'target', width: t.width, height: t.height })] += 1

  const brandFails = new Map<string, number>()
  for (const issue of r.issues) {
    for (const m of issue.brandModes ?? []) brandFails.set(m.brand, (brandFails.get(m.brand) ?? 0) + (m.pass ? 0 : 1))
  }

  return {
    score: components.length ? Math.round((passing / components.length) * 100) : null,
    components: { total: components.length, passing, failing: components.length - passing },
    levels,
    frames: { total: frames.length, passing: frames.filter((f) => !f.failing).length },
    findings: r.issues.length + r.nonText.length + r.targets.length,
    failAA: r.issues.filter((i) => i.level === 'fail').length,
    // 1.4.3 / 1.4.6 / 1.4.11 are Perceivable; 2.5.8 / 2.5.5 are Operable. The scan has no
    // Understandable or Robust checks yet, so those stay at zero rather than look audited.
    principles: { perceivable: r.issues.length + r.nonText.length, operable: r.targets.length, understandable: 0, robust: 0 },
    severity,
    brands: [...brandFails].map(([brand, failing]) => ({ brand, failing })),
  }
}
