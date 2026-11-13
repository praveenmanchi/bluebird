import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './SegmentTab.css'

export interface SegmentTabProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'selected'> {
  /** Figma State=Selected. */
  selected?: boolean
  /** Figma "Label". */
  children?: ComponentChildren
  /** Figma "Icon" (swap any UI Icons glyph). Omit for "Show icon" = false. */
  icon?: IconName
  /** Force State=Hover or State=Focus (stories, visual regression). Disabled is the native `disabled`. */
  state?: 'default' | 'hover' | 'focus'
}

/** Figma "Tab selecters" (308:51054): one segment of the Tab sub menu. Renders <button role="tab">. */
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
      class={`bb-segment-tab${icon ? '' : ' bb-segment-tab--text-only'} ${cls ?? ''}`}
    >
      <span class="bb-segment-tab__container">
        {icon && <span class="bb-segment-tab__icon"><Icon name={icon} /></span>}
        {children !== undefined && <span class="bb-segment-tab__label">{children}</span>}
      </span>
    </button>
  )
}
