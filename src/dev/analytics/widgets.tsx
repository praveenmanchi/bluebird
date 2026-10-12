// Small pieces the analytics page repeats: brand logo chips, people, sort
// controls, a sortable + searchable table, and CSV export.
import type { ComponentChildren } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import { Avatar, BrandLogo, Icon, type IconName } from '@shared/ui'
import { BRANDS, type BrandId } from '@shared/brand'
import { config } from '@shared/config'
import { fmt } from './card'

const isBrand = (id: string): id is BrandId => (BRANDS as readonly string[]).includes(id)
export const brandLabel = (id: string): string => config.brand.brands[id]?.label ?? id

/** A brand's logo on its own banner colour; the label beside it unless `logoOnly`. */
export function BrandChip({ id, logoOnly = false, size = 'sm' }: { id: string; logoOnly?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span class="an-brand" data-size={size}>
      <span class="an-brand__logo" data-brand={id} role={logoOnly ? 'img' : undefined} aria-label={logoOnly ? brandLabel(id) : undefined}>
        {isBrand(id) && <BrandLogo brand={id} />}
      </span>
      {!logoOnly && <span class="an-brand__label">{brandLabel(id)}</span>}
    </span>
  )
}

export const initials = (name: string): string => name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

/** A person: initials avatar and name. */
export function Person({ name, detail }: { name: string; detail?: ComponentChildren }) {
  return (
    <span class="an-person">
      <Avatar size="sm" name={name}>{initials(name)}</Avatar>
      <span class="an-person__text">
        <span class="an-person__name">{name}</span>
        {detail && <span class="an-person__detail">{detail}</span>}
      </span>
    </span>
  )
}

export interface SortOption<K extends string> { key: K; label: string }

/** "Sort by" select for a chart card header. */
export function SortSelect<K extends string>({ options, value, onChange, label = 'Sort by' }: { options: readonly SortOption<K>[]; value: K; onChange: (k: K) => void; label?: string }) {
  return (
    <label class="an-sort">
      <span class="an-sort__label">{label}</span>
      <select class="dh-control" aria-label={label} value={value} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value as K)}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  )
}

export type Cell = string | number
export interface Column<T> {
  key: string
  label: string
  /** The sortable / searchable value. */
  value: (row: T) => Cell
  /** What to draw; defaults to the value, formatted. */
  render?: (row: T) => ComponentChildren
  numeric?: boolean
  /** Left out of search. */
  noSearch?: boolean
}

export interface SortState { key: string; dir: 'asc' | 'desc' }

export function sortRows<T>(rows: readonly T[], columns: readonly Column<T>[], sort: SortState | null): T[] {
  const column = columns.find((c) => c.key === sort?.key)
  if (!column || !sort) return [...rows]
  const sign = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = column.value(a)
    const y = column.value(b)
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return cmp * sign
  })
}

export function searchRows<T>(rows: readonly T[], columns: readonly Column<T>[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...rows]
  return rows.filter((row) => columns.some((c) => !c.noSearch && String(c.value(row)).toLowerCase().includes(q)))
}

export interface SortableTableProps<T> {
  caption: string
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  defaultSort?: SortState
  query?: string
  /** Shown when the query leaves nothing. */
  empty?: string
}

/** Click a column heading to sort it; click again to flip. */
export function SortableTable<T>({ caption, columns, rows, rowKey, defaultSort, query = '', empty = 'Nothing matches.' }: SortableTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)
  const shown = useMemo(() => sortRows(searchRows(rows, columns, query), columns, sort), [rows, columns, query, sort])
  const toggle = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: columns.find((c) => c.key === key)?.numeric ? 'desc' : 'asc' }))
  return (
    <div class="dh-table-wrap">
      <table class="dh-table an-sortable">
        <caption class="dh-sr">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" data-num={c.numeric || undefined} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" class="an-sortable__head" onClick={() => toggle(c.key)}>
                  {c.label}
                  <Icon name={sort?.key === c.key && sort.dir === 'asc' ? 'dropdown-up' : 'dropdown-down'} size="sm" class="an-sortable__icon" data-active={sort?.key === c.key || undefined} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => <td key={c.key} data-num={c.numeric || undefined}>{c.render ? c.render(row) : typeof c.value(row) === 'number' ? fmt(c.value(row) as number) : c.value(row)}</td>)}
            </tr>
          ))}
          {shown.length === 0 && <tr><td colSpan={columns.length} class="an-sortable__empty">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

/** Search field for a card header. */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <span class="an-search">
      <Icon name="search" size="sm" class="an-search__icon" />
      <input class="dh-control an-search__input" type="search" value={value} placeholder={placeholder} aria-label={placeholder} onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)} />
    </span>
  )
}

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return <button type="button" class="dh-btn" data-variant="quiet" data-icon aria-label={label} title={label} onClick={onClick}><Icon name={icon} size="sm" /></button>
}

/** RFC 4180-ish: quote anything with a comma, quote or newline. */
export function toCsv(columns: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const cell = (v: Cell) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [columns, ...rows].map((r) => r.map(cell).join(',')).join('\n')
}

export function downloadCsv(name: string, columns: readonly string[], rows: readonly (readonly Cell[])[]): void {
  const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}
