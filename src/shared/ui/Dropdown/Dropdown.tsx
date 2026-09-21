import type { JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './Dropdown.css'

export type DropdownMode = 'single' | 'multi'

export interface DropdownProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Figma "Type": single shows the chosen value, multi a selection count. Visuals are identical; semantics differ. */
  mode?: DropdownMode
  /** Figma "Value". */
  value?: string
  placeholder?: string
  /** Figma "State=Open". */
  open?: boolean
  /** Force the Hover variant (stories, visual regression). */
  state?: 'default' | 'hover'
  onOpenChange?: (open: boolean) => void
}

/** Figma "Dropdown" (40000047:5292) trigger. Pair with DropdownMenu. */
export function Dropdown({ mode = 'single', value, placeholder = 'Select', open = false, state, disabled, onOpenChange, class: cls, type = 'button', ...rest }: DropdownProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      data-mode={mode}
      data-state={state}
      class={`bb-dropdown ${cls ?? ''}`}
      onClick={() => onOpenChange?.(!open)}
    >
      <span class="bb-dropdown__value" data-placeholder={value ? undefined : ''}>{value ?? placeholder}</span>
      <span class="bb-dropdown__chevron"><Icon name={open ? 'dropdown-up' : 'dropdown-down'} /></span>
    </button>
  )
}
