import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './CountBadge.css'

export interface CountBadgeProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label' | 'icon'> {
  /** Figma "Updated" text layer ("Effected Components"). */
  label: ComponentChildren
  /** Figma "52" text layer inside the bordered box. */
  count: number | string
  /** Shows the `count-badge-icon` glyph before the label, as in the alias set "Frame 1430102563" (83:746). */
  icon?: boolean
}

/** Figma "Frame 1430102586" (86:1891): a label followed by a bordered count box. */
export function CountBadge({ label, count, icon = false, class: cls, ...rest }: CountBadgeProps) {
  return (
    <span {...rest} class={`bb-count-badge ${cls ?? ''}`} data-icon={icon || undefined}>
      <span class="bb-count-badge__label-group">
        {icon && <span class="bb-count-badge__icon"><Icon name="count-badge-icon" /></span>}
        <span class="bb-count-badge__label">{label}</span>
      </span>
      <span class="bb-count-badge__count">{count}</span>
    </span>
  )
}
