// Line chart, sparkline and stat tile for dev.html › Analytics. Hand-drawn SVG
// against the analytics.css roles (--an-*); marks follow the dataviz specs:
// 2px lines, a 10% area wash, hairline grid, one axis, crosshair hover.
import { useState } from 'preact/hooks'
import { Icon, type IconName } from '@shared/ui'
import { fmt, niceTicks, useWidth, type TooltipApi } from './card'
import type { Kpi } from './mock'

const PAD = { top: 12, right: 44, bottom: 26, left: 40 }

export interface LinePoint { label: string; value: number }

export interface LineChartProps {
  points: readonly LinePoint[]
  series: string
  tooltip: TooltipApi
  height?: number
  unit?: string
}

/** One series over time: area wash, 2px line, end dot with its value, crosshair that snaps to the nearest day. */
export function LineChart({ points, series, tooltip, height = 220, unit = '' }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.value))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]!
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length < 2 ? plotW / 2 : (i * plotW) / (points.length - 1))
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
  const every = Math.max(1, Math.ceil(points.length / 6))
  const last = points.length - 1

  const show = (i: number, event: PointerEvent | FocusEvent) => {
    setHover(i)
    const p = points[i]!
    tooltip.show(event, { title: p.label, rows: [{ value: `${fmt(p.value)}${unit}`, label: series, key: 'var(--an-series-1)' }] })
  }
  const onMove = (e: PointerEvent) => {
    const box = (e.currentTarget as SVGRectElement).getBoundingClientRect()
    const i = Math.round(((e.clientX - box.left) / box.width) * last)
    show(Math.max(0, Math.min(last, i)), e)
  }
  /** Arrow keys walk the days; the tooltip sits on the point, as the pointer would put it. */
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = Math.max(0, Math.min(last, (hover ?? last) + step))
    const box = (e.currentTarget as SVGRectElement).getBoundingClientRect()
    show(i, { clientX: box.left + x(i) - PAD.left, clientY: box.top + y(points[i]!.value) - PAD.top } as PointerEvent)
  }

  return (
    <div ref={ref} class="an-line">
      <svg width={width} height={height} role="img" aria-label={`${series}: ${fmt(points[0]?.value ?? 0)} to ${fmt(points[last]?.value ?? 0)}${unit} over ${points.length} days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line class="an-gridline" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text class="an-axis" x={PAD.left - 8} y={y(t)} dy="0.32em" text-anchor="end">{fmt(t)}</text>
          </g>
        ))}
        {points.map((p, i) => i === last || (i % every === 0 && last - i >= every / 2)
          ? <text key={p.label} class="an-axis" x={x(i)} y={height - 6} text-anchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}>{shortDate(p.label)}</text>
          : null)}
        <path d={area} style={{ fill: 'var(--an-series-1)', fillOpacity: 0.1 }} />
        <path d={line} fill="none" style={{ stroke: 'var(--an-series-1)' }} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        {hover !== null && <line class="an-crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} />}
        {[hover ?? last].map((i) => (
          <circle key="dot" cx={x(i)} cy={y(points[i]?.value ?? 0)} r="4" style={{ fill: 'var(--an-series-1)', stroke: 'var(--an-surface)' }} stroke-width="2" />
        ))}
        <text class="an-value" x={x(last) + 8} y={y(points[last]?.value ?? 0)} dy="0.32em">{fmt(points[last]?.value ?? 0)}</text>
        <rect
          class="an-hit"
          x={PAD.left} y={PAD.top} width={Math.max(0, plotW)} height={plotH}
          tabIndex={0}
          aria-label={`${series} by day. Use the arrow keys to read each day.`}
          onPointerMove={onMove}
          onPointerLeave={() => { setHover(null); tooltip.hide() }}
          onKeyDown={onKey}
          onBlur={() => { setHover(null); tooltip.hide() }}
        />
      </svg>
    </div>
  )
}

export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** 12 points in the de-emphasis hue; the current period is the accent end dot. */
export function Sparkline({ values }: { values: readonly number[] }) {
  const w = 96
  const h = 28
  const min = Math.min(...values)
  const span = Math.max(1e-9, Math.max(...values) - min)
  const pts = values.map((v, i) => [(i * (w - 6)) / (values.length - 1) + 3, h - 4 - ((v - min) / span) * (h - 8)] as const)
  const end = pts[pts.length - 1]!
  return (
    <svg class="an-spark" width={w} height={h} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" style={{ stroke: 'var(--an-muted-mark)' }} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx={end[0]} cy={end[1]} r="3" style={{ fill: 'var(--an-series-1)' }} />
    </svg>
  )
}

function DeltaIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  const d = direction === 'up' ? 'M2 8.5L6 3.5L10 8.5Z' : direction === 'down' ? 'M2 3.5L6 8.5L10 3.5Z' : 'M2 5.25H10V6.75H2Z'
  return <svg class="an-delta__icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
}

export interface StatTileProps {
  label: string
  icon?: IconName
  kpi: Kpi
  unit?: string
  /** Fewer open tickets or shorter cycles are good news. */
  upIsGood?: boolean
  /** The dashboard's one hero number. */
  hero?: boolean
  period: string
}

export function StatTile({ label, icon, kpi, unit = '', upIsGood = true, hero = false, period }: StatTileProps) {
  const change = kpi.previous ? (kpi.value - kpi.previous) / kpi.previous : 0
  const up = change >= 0
  const good = Math.abs(change) < 0.005 ? 'flat' : up === upIsGood ? 'good' : 'bad'
  return (
    <div class="an-stat" data-hero={hero || undefined}>
      <span class="an-stat__label">{icon && <Icon name={icon} size="sm" class="an-stat__icon" />}{label}</span>
      <span class="an-stat__value">{fmt(kpi.value)}{unit && <span class="an-stat__unit">{unit}</span>}</span>
      <span class="an-stat__foot">
        <span class="an-delta" data-tone={good}>
          <DeltaIcon direction={good === 'flat' ? 'flat' : up ? 'up' : 'down'} />
          {`${up ? '+' : ''}${(change * 100).toFixed(1)}%`}
          <span class="dh-sr">{good === 'good' ? ' (better)' : good === 'bad' ? ' (worse)' : ''}</span>
        </span>
        <span class="an-stat__period">vs previous {period}</span>
      </span>
      <Sparkline values={kpi.trend} />
    </div>
  )
}
