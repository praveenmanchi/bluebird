import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { Checkbox } from '../Checkbox/Checkbox'
import './MenuItem.css'

export type MenuItemMode = 'single' | 'multi'

export interface MenuItemProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label' | 'onSelect' | 'icon'> {
  /** Figma "Mode": single shows a leading icon, multi embeds a Checkbox. */
  mode?: MenuItemMode
  /** Figma "Label". */
  label: ComponentChildren
  /** Figma "Count" (+ "Show count" when set). */
  count?: string | number
  /** Figma "State=Selected". */
  selected?: boolean
  /** Figma "State=Disabled". */
  disabled?: boolean
  /** Force the Hover variant (stories, visual regression). */
  state?: 'default' | 'hover'
  /** Figma "Leading icon" instance; defaults to the set's `component` glyph. */
  icon?: IconName
  onSelect?: () => void
}

/** Figma "Menu item" (40000046:5311). Rendered as an option inside a DropdownMenu listbox. */
export function MenuItem({ mode = 'single', label, count, selected = false, disabled = false, state, icon = 'component', onSelect, class: cls, ...rest }: MenuItemProps) {
  const activate = () => { if (!disabled) onSelect?.() }
  const multi = mode === 'multi'
  return (
    <div
      {...rest}
      role="option"
      tabIndex={disabled ? -1 : 0}
      aria-selected={multi ? undefined : selected}
      aria-checked={multi ? selected : undefined}
      aria-disabled={disabled || undefined}
      data-mode={mode}
      data-state={state}
      class={`bb-menu-item ${cls ?? ''}`}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate() } }}
    >
      {multi
        ? <Checkbox checked={selected} disabled={disabled} tabIndex={-1} aria-hidden="true" />
        : <span class="bb-menu-item__icon"><Icon name={icon} /></span>}
      <span class="bb-menu-item__label">{label}</span>
      {count !== undefined && <span class="bb-menu-item__count">{count}</span>}
    </div>
  )
}
