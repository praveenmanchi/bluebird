import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './Chip.css'

export interface ChipProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'label'> {
  /** Figma "Text". */
  children?: ComponentChildren
  /** Figma "Icon" boolean: show the leading Tab Icon instance. */
  showIcon?: boolean
  /** The Tab Icon instance inside the chip (Figma default: Variables). */
  icon?: IconName
  /** Not a Figma variant of this set; uses the chip-filter/*-selected tokens. */
  selected?: boolean
  /** Force the hover look (stories, visual regression). Real hover comes from :hover. */
  state?: 'default' | 'hover'
}

/** Figma "Filiters" (197:1696): a filter chip with an optional leading glyph and a label. */
export function Chip({ children = 'Label', showIcon = true, icon = 'variables', selected = false, state, disabled, class: cls, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      data-selected={selected || undefined}
      data-state={state}
      class={`bb-chip ${cls ?? ''}`}
    >
      {showIcon && <span class="bb-chip__icon"><Icon name={icon} /></span>}
      <span class="bb-chip__container">
        <span class="bb-chip__label">{children}</span>
      </span>
    </button>
  )
}
