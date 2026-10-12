// Bar list, stacked bars and heatmap for dev.html › Analytics. HTML rows rather
// than SVG so labels wrap and bars stretch with the card. Bars are ≤ 24px with a
// 4px rounded data end; touching segments are split by a 2px surface gap.
import type { ComponentChildren } from 'preact'
import type { TooltipApi } from './card'
import { fmt } from './card'

export interface BarRow { id: string; label: string; value: number; detail?: string; /** Drawn before the label: a logo chip or tab icon. */ leading?: ComponentChildren }

export interface BarListProps {
  rows: readonly BarRow[]
  /** Series name for the tooltip ("Sessions", "Installs"). */
  measure: string
  tooltip: TooltipApi
  unit?: string
  /** Emphasise one row (the brand filter); the others recede. */
  highlight?: string
  /** Rows become buttons: click (or Enter) selects. */
  onSelect?: (id: string) => void
}

/** Magnitude by category: one hue, sorted, value at the tip. */
export function BarList({ rows, measure, tooltip, unit = '', highlight, onSelect }: BarListProps) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul class="an-bars" aria-label={measure}>
      {rows.map((row) => {
        const content = { title: row.label, rows: [{ value: `${fmt(row.value)}${unit}`, label: measure, key: 'var(--an-series-1)' }, ...(row.detail ? [{ value: row.detail, label: '' }] : [])] }
        return (
          <li
            key={row.id}
            class="an-bars__row"
            data-dim={highlight && highlight !== row.id ? '' : undefined}
            tabIndex={0}
            role={onSelect ? 'button' : undefined}
            aria-pressed={onSelect ? highlight === row.id : undefined}
            data-selectable={onSelect ? '' : undefined}
            onClick={onSelect ? () => onSelect(row.id) : undefined}
            onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(row.id) } } : undefined}
            onPointerMove={(e) => tooltip.show(e, content)}
            onPointerLeave={tooltip.hide}
            onFocus={(e) => tooltip.show(e, content)}
            onBlur={tooltip.hide}
          >
            <span class="an-bars__label">{row.leading}{row.label}</span>
            <span class="an-bars__track">
              <span class="an-bars__bar" style={{ width: `${(row.value / max) * 100}%` }} />
              <span class="an-bars__value">{fmt(row.value)}{unit}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export interface StackSeries { key: string; label: string; color: string }
export interface StackRow { label: string; values: Record<string, number>; /** Drawn instead of the plain label. */ leading?: ComponentChildren }

/** Parts of a whole per row (tickets by status per designer): legend above, total at the tip. */
export function StackedBars({ rows, series, tooltip }: { rows: readonly StackRow[]; series: readonly StackSeries[]; tooltip: TooltipApi }) {
  const max = Math.max(1, ...rows.map((r) => series.reduce((s, x) => s + (r.values[x.key] ?? 0), 0)))
  return (
    <ul class="an-bars" aria-label="Tickets by status">
      {rows.map((row) => {
        const total = series.reduce((s, x) => s + (row.values[x.key] ?? 0), 0)
        const content = { title: `${row.label} · ${total} tickets`, rows: series.map((x) => ({ value: fmt(row.values[x.key] ?? 0), label: x.label, key: x.color })) }
        const shown = series.filter((x) => (row.values[x.key] ?? 0) > 0)
        return (
          <li
            key={row.label}
            class="an-bars__row"
            tabIndex={0}
            onPointerMove={(e) => tooltip.show(e, content)}
            onPointerLeave={tooltip.hide}
            onFocus={(e) => tooltip.show(e, content)}
            onBlur={tooltip.hide}
          >
            <span class="an-bars__label">{row.leading ?? row.label}</span>
            <span class="an-bars__track">
              <span class="an-stack" style={{ width: `${(total / max) * 100}%` }}>
                {shown.map((x) => <span key={x.key} class="an-stack__seg" style={{ flexGrow: row.values[x.key], background: x.color }} />)}
              </span>
              <span class="an-bars__value">{total}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function Legend({ series, mark = 'rect' }: { series: readonly { label: string; color: string }[]; mark?: 'rect' | 'line' }) {
  return (
    <ul class="an-legend__list">
      {series.map((s) => (
        <li key={s.label} class="an-legend__item"><span class="an-legend__key" data-mark={mark} style={{ background: s.color }} aria-hidden="true" />{s.label}</li>
      ))}
    </ul>
  )
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
/** Sequential blue, darkest (≈ none) to lightest (busiest): on the dark surface, little activity recedes. */
export const HEAT_STEPS = ['var(--an-heat-0)', 'var(--an-heat-1)', 'var(--an-heat-2)', 'var(--an-heat-3)', 'var(--an-heat-4)', 'var(--an-heat-5)'] as const

export function heatStep(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0
  // Equal bands of the busiest cell; the lowest band shares the "none" step so a few late-night sessions recede.
  return Math.min(HEAT_STEPS.length - 1, Math.floor((value / max) * HEAT_STEPS.length))
}

/** Sessions by weekday × hour. Cells carry their own tooltip; the table view lists every value. */
export function Heatmap({ grid, tooltip }: { grid: readonly (readonly number[])[]; tooltip: TooltipApi }) {
  const max = Math.max(0, ...grid.flat())
  return (
    <div class="an-heat" role="img" aria-label="Sessions by weekday and hour; switch to Table for every value">
      {grid.map((hours, day) => (
        <div key={day} class="an-heat__row">
          <span class="an-heat__day">{WEEKDAYS[day]}</span>
          {hours.map((v, hour) => (
            <span
              key={hour}
              class="an-heat__cell"
              style={{ background: HEAT_STEPS[heatStep(v, max)] }}
              onPointerMove={(e) => tooltip.show(e, { title: `${WEEKDAYS[day]} ${String(hour).padStart(2, '0')}:00`, rows: [{ value: fmt(v), label: 'sessions' }] })}
              onPointerLeave={tooltip.hide}
            />
          ))}
        </div>
      ))}
      <div class="an-heat__row an-heat__axis" aria-hidden="true">
        <span class="an-heat__day" />
        {Array.from({ length: 24 }, (_, h) => <span key={h} class="an-heat__hour">{h % 6 === 0 ? `${String(h).padStart(2, '0')}h` : ''}</span>)}
      </div>
      <div class="an-heat__scale" aria-hidden="true">
        <span>Fewer</span>
        {HEAT_STEPS.map((c) => <span key={c} class="an-heat__swatch" style={{ background: c }} />)}
        <span>More sessions</span>
      </div>
    </div>
  )
}
