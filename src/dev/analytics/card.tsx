// Chart chrome for dev.html › Analytics: the card every chart sits in (title,
// Chart / Table switch, one tooltip), and the width hook charts draw against.
import type { ComponentChildren, RefObject } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Icon, type IconName } from '@shared/ui'

export interface TableView {
  columns: readonly string[]
  rows: readonly (readonly (string | number)[])[]
}

export interface TipContent {
  title: string
  /** Value first, label second: the reader already knows the series and wants the number. */
  rows: readonly { value: string; label: string; key?: string }[]
}
interface Tip extends TipContent { x: number; y: number }

export interface TooltipApi {
  /** Show next to the pointer, or next to the focused mark when there is no pointer. */
  show: (event: PointerEvent | FocusEvent, content: TipContent) => void
  hide: () => void
}

/** The width a chart has to draw in, followed as the window resizes. */
export function useWidth<T extends HTMLElement>(fallback = 560): [RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(240, Math.floor(entry.contentRect.width))) })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

export interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: IconName
  /** Header controls (sort, search, export) before the Chart / Table switch. */
  actions?: ComponentChildren
  /** The same values as a table: every value a tooltip shows is reachable without hovering. */
  table?: TableView
  span?: 1 | 2 | 3
  /** Legend or other keys, above the plot. */
  legend?: ComponentChildren
  children: (tooltip: TooltipApi) => ComponentChildren
}

export function ChartCard({ title, subtitle, icon, actions, table, span = 1, legend, children }: ChartCardProps) {
  const card = useRef<HTMLElement>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [tip, setTip] = useState<Tip | null>(null)

  const tooltip: TooltipApi = {
    show: (event, content) => {
      const box = card.current?.getBoundingClientRect()
      if (!box) return
      const pointer = 'clientX' in event ? event : null
      const target = (event.currentTarget as Element | null)?.getBoundingClientRect()
      const x = pointer ? pointer.clientX : (target ? target.left + target.width / 2 : box.left)
      const y = pointer ? pointer.clientY : (target ? target.top : box.top)
      setTip({ ...content, x: x - box.left, y: y - box.top })
    },
    hide: () => setTip(null),
  }

  return (
    <section ref={card} class="an-card" data-span={span} aria-label={title}>
      <header class="an-card__head">
        {icon && <span class="an-card__icon"><Icon name={icon} size="sm" /></span>}
        <div class="an-card__text">
          <h3 class="an-card__title">{title}</h3>
          {subtitle && <p class="an-card__subtitle">{subtitle}</p>}
        </div>
        <div class="an-card__actions">
          {actions}
          {table && (
            <div class="dh-seg" role="group" aria-label={`${title}: view`}>
              <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
              <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
            </div>
          )}
        </div>
      </header>
      {view === 'chart' ? (
        <>
          {legend && <div class="an-legend">{legend}</div>}
          <div class="an-card__plot" onPointerLeave={() => setTip(null)}>{children(tooltip)}</div>
        </>
      ) : table && <DataTable table={table} caption={title} />}
      {tip && view === 'chart' && (
        <div class="an-tip" role="status" style={{ left: `${tip.x}px`, top: `${tip.y}px` }} data-flip={tip.x > (card.current?.clientWidth ?? 0) * 0.6 || undefined}>
          <div class="an-tip__title">{tip.title}</div>
          {tip.rows.map((row) => (
            <div key={row.label} class="an-tip__row">
              {row.key && <span class="an-tip__key" style={{ background: row.key }} aria-hidden="true" />}
              <strong class="an-tip__value">{row.value}</strong>
              <span class="an-tip__label">{row.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function DataTable({ table, caption }: { table: TableView; caption: string }) {
  return (
    <div class="dh-table-wrap">
      <table class="dh-table">
        <caption class="dh-sr">{caption}</caption>
        <thead><tr>{table.columns.map((c, i) => <th key={c} scope="col" data-num={typeof table.rows[0]?.[i] === 'number' || undefined}>{c}</th>)}</tr></thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} data-num={typeof cell === 'number' || undefined}>{typeof cell === 'number' ? fmt(cell) : cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 1,284 · 12.9K; keeps one decimal for small fractional values. */
export function fmt(n: number): string {
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Clean axis ticks: 0, step, 2·step … covering max, with step from 1 / 2 / 5 × 10ⁿ. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => round(i * step))
}
const round = (n: number) => Math.round(n * 1e6) / 1e6
