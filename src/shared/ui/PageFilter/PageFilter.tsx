import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './PageFilter.css'

export interface PageFilterProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'label'> {
  /** Figma "All Pages" text layer: the current page selection. */
  label?: ComponentChildren
  /** Figma "Tab Icons" instance (file). */
  icon?: IconName
  /** Whether the page menu this trigger controls is open (aria-expanded). */
  open?: boolean
  /** Force the hover look (stories, visual regression). Real hover comes from :hover. */
  state?: 'default' | 'hover'
}

/** Figma "pages" (7:44524): the page-scope filter trigger — file glyph, label and a tiny chevron. */
export function PageFilter({ label = 'All Pages', icon = 'file', open = false, state, disabled, class: cls, type = 'button', ...rest }: PageFilterProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      data-open={open || undefined}
      data-state={state}
      class={`bb-page-filter ${cls ?? ''}`}
    >
      <span class="bb-page-filter__icon"><Icon name={icon} /></span>
      <span class="bb-page-filter__container">
        <span class="bb-page-filter__label">{label}</span>
        <span class="bb-page-filter__chevron"><Icon name="chevron-tiny" /></span>
      </span>
    </button>
  )
}
