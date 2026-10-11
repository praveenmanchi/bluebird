import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './DisclosureToggle.css'

export interface DisclosureToggleProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onToggle'> {
  /** Figma "Expanded". */
  expanded?: boolean
  onToggle?: (expanded: boolean) => void
  showLabel?: ComponentChildren
  hideLabel?: ComponentChildren
}

/** Figma "Disclosure Toggle" (40000446:8631): "Show details ⌄ / Hide details ⌃". */
export function DisclosureToggle({
  expanded = false, onToggle, showLabel = 'Show details', hideLabel = 'Hide details', class: cls, type = 'button', ...rest
}: DisclosureToggleProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-expanded={expanded}
      class={`bb-disclosure-toggle ${cls ?? ''}`}
      data-expanded={expanded || undefined}
      onClick={(e) => { rest.onClick?.(e); onToggle?.(!expanded) }}
    >
      <span class="bb-disclosure-toggle__label">{expanded ? hideLabel : showLabel}</span>
      <Icon name="chevron-small" class="bb-disclosure-toggle__chevron" />
    </button>
  )
}
