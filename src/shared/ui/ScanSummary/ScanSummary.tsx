import type { ComponentChildren, JSX } from 'preact'
import { useId, useState } from 'preact/hooks'
import type { IconName } from '../Icon/Icon'
import type { MetaBadgeTone } from '../MetaBadge/MetaBadge'
import type { LegendTone } from '../LegendDot/LegendDot'
import { BrandCount } from '../BrandCount/BrandCount'
import { BreakdownCard } from '../BreakdownCard/BreakdownCard'
import { KpiTile, type KpiTone } from '../KpiTile/KpiTile'
import { LevelRow } from '../LevelRow/LevelRow'
import { ScoreRow } from '../ScoreRow/ScoreRow'
import { SummaryHeader } from '../SummaryHeader/SummaryHeader'
import './ScanSummary.css'

export type ScanSummaryState = 'results' | 'empty'

export interface ScanSummaryKpi {
  label: ComponentChildren
  value: ComponentChildren
  caption?: ComponentChildren
  tone?: KpiTone
  icon?: IconName
}

export interface ScanSummaryLevel {
  name: ComponentChildren
  hint?: ComponentChildren
  /** null before a scan. */
  passing: number | null
  total: number
}

export interface ScanSummaryBreakdownRow {
  tone: LegendTone
  label: ComponentChildren
  value: ComponentChildren
}

export interface ScanSummaryProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title' | 'onToggle'> {
  /** Figma "State": Results after a scan, Empty before one. */
  state?: ScanSummaryState
  /** Figma "Expanded". Controlled when set; otherwise the summary keeps its own state. */
  expanded?: boolean
  defaultExpanded?: boolean
  onToggle?: (expanded: boolean) => void
  title?: ComponentChildren
  stats?: ComponentChildren
  status?: { tone: MetaBadgeTone; label: ComponentChildren }
  /** Share of components passing, 0–100, or null when there is nothing to score. */
  score: number | null
  meterScore?: ComponentChildren
  caption?: ComponentChildren
  kpis: readonly ScanSummaryKpi[]
  /** Omit to leave out "By component level" (the Figma Empty variants do). */
  levels?: readonly ScanSummaryLevel[]
  principles: readonly ScanSummaryBreakdownRow[]
  severity: readonly ScanSummaryBreakdownRow[]
  /** Findings per brand mode; null counts before a scan. Omit or pass [] to leave the strip out. */
  brands?: readonly { brand: ComponentChildren; count: number | null }[]
}

const pairs = <T,>(items: readonly T[]): T[][] => items.reduce<T[][]>((out, item, i) => (i % 2 ? out[out.length - 1]!.push(item) : out.push([item]), out), [])

/** Figma "Scan Summary" (40000444:20376): the accessibility dashboard above the findings.
 *  Collapsed it shows only the score; "Show details" adds the four KPI tiles and the
 *  component-level, principle, severity and brand-mode breakdowns. */
export function ScanSummary({
  state = 'results', expanded, defaultExpanded = false, onToggle,
  title = 'Scan summary', stats, status, score, meterScore, caption,
  kpis, levels, principles, severity, brands = [], class: cls, ...rest
}: ScanSummaryProps) {
  const [own, setOwn] = useState(defaultExpanded)
  const open = expanded ?? own
  const detailsId = useId()
  const toggle = (next: boolean) => { if (expanded === undefined) setOwn(next); onToggle?.(next) }

  return (
    <section {...rest} class={`bb-scan-summary ${cls ?? ''}`} data-state={state} data-expanded={open || undefined} aria-label={typeof title === 'string' ? title : 'Scan summary'}>
      <SummaryHeader title={title} stats={stats} status={status} expanded={open} onToggle={toggle} controls={detailsId} />
      <ScoreRow value={score} meterScore={meterScore} caption={caption} />
      <div id={detailsId} class="bb-scan-summary__details" hidden={!open}>
        {/* Tiles go in pairs so the row reads 4 across at L and 2 × 2 at M / S — never 3 + 1. */}
        <div class="bb-scan-summary__kpis">
          {pairs(kpis).map((pair, i) => (
            <div key={i} class="bb-scan-summary__kpi-pair">
              {pair.map((k, j) => <KpiTile key={j} tone={k.tone} label={k.label} value={k.value} caption={k.caption} icon={k.icon} />)}
            </div>
          ))}
        </div>
        {levels && levels.length > 0 && (
          <div class="bb-scan-summary__levels">
            <div class="bb-scan-summary__heading">
              <h4 class="bb-scan-summary__heading-title">By component level</h4>
              <span class="bb-scan-summary__heading-hint">pass / total</span>
            </div>
            {levels.map((l, i) => <LevelRow key={i} name={l.name} hint={l.hint} passing={l.passing} total={l.total} />)}
          </div>
        )}
        <div class="bb-scan-summary__breakdown">
          <BreakdownCard title="By principle" rows={principles} />
          <BreakdownCard title="By severity" rows={severity} />
        </div>
        {brands.length > 0 && (
          <div class="bb-scan-summary__brands">
            <h4 class="bb-scan-summary__heading-title">Findings by brand mode</h4>
            <div class="bb-scan-summary__brand-row">
              {brands.map((b, i) => <BrandCount key={i} brand={b.brand} count={b.count} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
