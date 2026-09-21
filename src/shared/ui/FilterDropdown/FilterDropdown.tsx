import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './FilterDropdown.css'

export interface FilterDropdownProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon'> {
  /** Figma "Dropdown Name". */
  children?: ComponentChildren
  /** Figma "Icon" (boolean): shows the `component-mark` glyph before the name. */
  icon?: boolean
  /** Menu is open: chevron flipped, aria-expanded. */
  open?: boolean
  /** Force the Hover visuals (stories, visual regression). Real hover comes from :hover. */
  state?: 'default' | 'hover'
}

/** Figma "filters" (7:44569): a filter trigger chip with an optional component mark, a name and a small chevron. */
export function FilterDropdown({ children, icon = true, open = false, state, class: cls, type = 'button', ...rest }: FilterDropdownProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-haspopup="menu"
      aria-expanded={open}
      data-open={open || undefined}
      data-state={state}
      class={`bb-filter-dropdown ${cls ?? ''}`}
    >
      {icon && <span class="bb-filter-dropdown__icon"><Icon name="component-mark" /></span>}
      <span class="bb-filter-dropdown__label">{children}</span>
      <span class="bb-filter-dropdown__chevron" aria-hidden="true"><Icon name="chevron-small" /></span>
    </button>
  )
}
