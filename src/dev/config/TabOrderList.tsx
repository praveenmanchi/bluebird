import { useState } from 'preact/hooks'
import { Icon, ICONS, Toggle, type IconName } from '@shared/ui'
import type { BrandTabConfig, BrandTabRow } from '@shared/config'
import { moveTab, setTabEnabled } from './draft'

export interface TabOrderListProps {
  rows: readonly BrandTabConfig[]
  /** Label, icon, availability and personas per tab id. */
  info: ReadonlyMap<string, BrandTabRow>
  onChange: (rows: BrandTabConfig[]) => void
}

const iconFor = (name: string): IconName => (name in ICONS ? name as IconName : 'variables')

/** The brand's tab bar, top to bottom = left to right: drag a row, or use its arrows, to reorder; the switch shows or hides it. */
export function TabOrderList({ rows, info, onChange }: TabOrderListProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const move = (from: number, to: number) => onChange(moveTab(rows, from, to))

  return (
    <div class="cfg-tabs">
      <div class="cfg-tabs__columns" aria-hidden="true">
        <span />
        <span>Order</span>
        <span />
        <span>Tab</span>
        <span>Shown to</span>
        <span />
        <span>Visible</span>
      </div>
      <ol class="cfg-tabs__list" aria-label="Tab order">
        {rows.map((row, i) => {
          const tab = info.get(row.id)
          const label = tab?.label ?? row.id
          const unavailable = tab?.available === false
          return (
            <li
              key={row.id}
              class="cfg-tabs__row"
              data-off={!row.enabled || unavailable || undefined}
              data-dragging={dragging === i || undefined}
              data-over={over === i && dragging !== i ? (dragging !== null && dragging < i ? 'after' : 'before') : undefined}
              draggable
              onDragStart={(e) => { setDragging(i); e.dataTransfer?.setData('text/plain', row.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault(); setOver(i) }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragging !== null) move(dragging, i); setDragging(null); setOver(null) }}
              onDragEnd={() => { setDragging(null); setOver(null) }}
            >
              <span class="cfg-tabs__grip" aria-hidden="true"><Icon name="footer-grip" size="sm" /></span>
              <span class="cfg-tabs__pos">{i + 1}</span>
              <span class="cfg-tabs__icon"><Icon name={iconFor(tab?.icon ?? '')} size="sm" /></span>
              <span class="cfg-tabs__label">{label}</span>
              <span class="cfg-tabs__personas">
                {unavailable
                  ? <span class="dh-chip">Off for every brand</span>
                  : tab?.personas.length
                    ? tab.personas.map((p) => <span key={p} class="dh-chip">{p}</span>)
                    : <span class="dh-chip">No persona</span>}
              </span>
              <span class="cfg-tabs__moves">
                <button type="button" class="dh-btn" data-variant="quiet" data-icon aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><Icon name="dropdown-up" size="sm" /></button>
                <button type="button" class="dh-btn" data-variant="quiet" data-icon aria-label={`Move ${label} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)}><Icon name="dropdown-down" size="sm" /></button>
              </span>
              <Toggle class="cfg-tabs__switch" label={`Show ${label}`} checked={row.enabled} disabled={unavailable} onChange={(on) => onChange(setTabEnabled(rows, row.id, on))} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
