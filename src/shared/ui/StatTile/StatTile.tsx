import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './StatTile.css'

export interface StatTileProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'icon' | 'label' | 'value'> {
  /** Figma "68" text layer: the large number. */
  value: number | string
  /** Figma "Variables" text layer: the caption next to the number. */
  label: ComponentChildren
  /** Figma "Tab Icons" instance (30px); defaults to Variables like the design. */
  icon?: IconName
}

/** Figma "Dashboard" (135:3290): a large glyph, a stat number and its label. */
export function StatTile({ value, label, icon = 'variables', class: cls, ...rest }: StatTileProps) {
  return (
    <div {...rest} class={`bb-stat-tile ${cls ?? ''}`}>
      <span class="bb-stat-tile__icon"><Icon name={icon} /></span>
      <span class="bb-stat-tile__body">
        <span class="bb-stat-tile__value">{value}</span>
        <span class="bb-stat-tile__label">{label}</span>
      </span>
    </div>
  )
}
