// ScanResult → ScanSummary props. Kept apart from Tab.tsx so the wording and the
// thresholds are testable without rendering the tab.
import type { ScanSummaryProps } from '@shared/ui'
import type { ScanResult, ScanScope } from '../messages'
import { summarizeScan } from '../summary'

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

export function summaryProps(r: ScanResult): ScanSummaryProps {
  const s = summarizeScan(r)
  const { total, passing, failing } = s.components
  const instances = (r.inventory?.components ?? []).reduce((n, c) => n + c.instances, 0)
  const framesFailing = s.frames.total - s.frames.passing
  return {
    state: 'results',
    stats: `${plural(r.scanned, 'node')} · ${r.durationMs} ms`,
    status: s.failAA > 0
      ? { tone: 'danger', label: `${s.failAA} fail AA` }
      : s.findings > 0 ? { tone: 'warning', label: plural(s.findings, 'finding') } : { tone: 'success', label: 'All clear' },
    score: s.score,
    meterScore: `${passing} / ${total}`,
    caption: total === 0
      ? 'No component instances in this scope — findings are listed below'
      : failing === 0 ? 'Every component passes the checks Bluebird runs' : `${plural(failing, 'component')} fail at least one check`,
    kpis: [
      { label: 'Components', value: String(total), caption: plural(instances, 'instance'), tone: 'neutral', icon: 'component' },
      { label: 'Passing', value: String(passing), caption: `${pct(passing, total)}% of components`, tone: total ? 'success' : 'empty', icon: 'status-good' },
      { label: 'Failing', value: String(failing), caption: plural(s.findings, 'finding'), tone: failing ? 'danger' : 'neutral', icon: 'status-error' },
      {
        label: 'Frames',
        value: `${s.frames.passing} / ${s.frames.total}`,
        caption: s.frames.total === 0 ? 'none in scope' : framesFailing ? `${framesFailing} with findings` : 'all pass',
        tone: s.frames.total === 0 ? 'empty' : framesFailing ? 'warning' : 'success',
        icon: 'layers',
      },
    ],
    levels: r.inventory
      ? [
          { name: 'Atoms', hint: 'No nested components', passing: s.levels.atom.passing, total: s.levels.atom.total },
          { name: 'Molecules', hint: 'Built from atoms', passing: s.levels.molecule.passing, total: s.levels.molecule.total },
          { name: 'Organisms', hint: 'Built from molecules or deeper', passing: s.levels.organism.passing, total: s.levels.organism.total },
        ]
      : undefined,
    principles: [
      { tone: 'perceivable', label: 'Perceivable', value: s.principles.perceivable },
      { tone: 'operable', label: 'Operable', value: s.principles.operable },
      { tone: 'understandable', label: 'Understandable', value: s.principles.understandable },
      { tone: 'robust', label: 'Robust', value: s.principles.robust },
    ],
    severity: [
      { tone: 'critical', label: 'Critical', value: s.severity.critical },
      { tone: 'serious', label: 'Serious', value: s.severity.serious },
      { tone: 'moderate', label: 'Moderate', value: s.severity.moderate },
      { tone: 'minor', label: 'Minor', value: s.severity.minor },
    ],
    brands: s.brands.map((b) => ({ brand: b.brand, count: b.failing })),
  }
}

/** Before the first scan: the same dashboard with every number waiting. */
export function emptySummaryProps(scope: ScanScope): ScanSummaryProps {
  const wait = { value: '—', caption: 'waiting for scan', tone: 'empty' } as const
  return {
    state: 'empty',
    stats: scope === 'page' ? 'Whole page' : 'Selection',
    status: { tone: 'neutral', label: 'Not scanned yet' },
    score: null,
    meterScore: '— / —',
    caption: 'Run a scan to see which components pass in every brand mode',
    kpis: [
      { label: 'Components', icon: 'component', ...wait },
      { label: 'Passing', icon: 'status-good', ...wait },
      { label: 'Failing', icon: 'status-error', ...wait },
      { label: 'Frames', icon: 'layers', ...wait },
    ],
    principles: (['perceivable', 'operable', 'understandable', 'robust'] as const).map((tone) => ({ tone, label: tone[0]!.toUpperCase() + tone.slice(1), value: '—' })),
    severity: (['critical', 'serious', 'moderate', 'minor'] as const).map((tone) => ({ tone, label: tone[0]!.toUpperCase() + tone.slice(1), value: '—' })),
  }
}
