import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './KpiTile.css'

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'empty'

export interface KpiTileProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Tone" — colours the value. */
  tone?: KpiTone
  /** Figma "Label" — sits after the value. */
  label?: ComponentChildren
  /** Figma "Value". */
  value?: ComponentChildren
  /** Figma "Caption". */
  caption?: ComponentChildren
  /** Figma "Icon" (instance swap). */
  icon?: IconName
  /** Figma "Show icon". */
  showIcon?: boolean
}

/** Figma "KPI Tile" (40000447:8612): icon, value + label, caption — one Scan Summary count. */
export function KpiTile({
  tone = 'neutral', label = 'Passing', value = '26', caption, icon = 'component', showIcon = true, class: cls, ...rest
}: KpiTileProps) {
  return (
    <div {...rest} class={`bb-kpi-tile ${cls ?? ''}`} data-tone={tone}>
      <div class="bb-kpi-tile__row">
        {showIcon && <span class="bb-kpi-tile__icon"><Icon name={icon} /></span>}
        <span class="bb-kpi-tile__text">
          <span class="bb-kpi-tile__value-group">
            <span class="bb-kpi-tile__value">{value}</span>
            <span class="bb-kpi-tile__label">{label}</span>
          </span>
          {caption !== undefined && <span class="bb-kpi-tile__caption">{caption}</span>}
        </span>
      </div>
    </div>
  )
}
