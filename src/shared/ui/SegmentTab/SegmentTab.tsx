import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './SegmentTab.css'

export interface SegmentTabProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'selected'> {
  /** Figma "Property 1": Selected. */
  selected?: boolean
  /** Figma "Select Text". */
  children?: ComponentChildren
  /** The fixed "Tab Icons" instance in Figma (`text` in the set). Omit for a text-only segment. */
  icon?: IconName
  /** Force the Hover visuals (stories, visual regression). Figma has no Hover variant. */
  state?: 'default' | 'hover'
}

/** Figma "Tab selecters" (308:51054): one segment of a segmented control. Renders <button role="tab">. */
export function SegmentTab({ selected = false, children, icon, state, class: cls, type = 'button', ...rest }: SegmentTabProps) {
  return (
    <button
      {...rest}
      type={type}
      role="tab"
      aria-selected={selected}
      tabIndex={rest.tabIndex ?? (selected ? 0 : -1)}
      data-selected={selected || undefined}
      data-state={state}
      class={`bb-segment-tab ${cls ?? ''}`}
    >
      <span class="bb-segment-tab__container">
        {icon && <span class="bb-segment-tab__icon"><Icon name={icon} /></span>}
        {children !== undefined && <span class="bb-segment-tab__label">{children}</span>}
      </span>
    </button>
  )
}
