import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary'

export interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon'> {
  /** Figma "Type". */
  variant?: ButtonVariant
  /** Figma "Leading icon" (+ "Show leading icon" when set). */
  leadingIcon?: IconName
  /** Figma "Trailing icon" (+ "Show trailing icon" when set). */
  trailingIcon?: IconName
  /** Replaces the leading icon with a spinner and disables the button. Not a Figma variant. */
  loading?: boolean
  /** Force a visual state (stories, visual regression). Real hover comes from :hover. */
  state?: 'default' | 'hover'
  /** Figma "Label". */
  children?: ComponentChildren
}

/** Figma "Button" (40000040:5139): Primary / Secondary × Default / Hover / Disabled. */
export function Button({ variant = 'primary', leadingIcon, trailingIcon, loading = false, state, disabled, children, class: cls, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-state={state}
      class={`bb-button ${cls ?? ''}`}
    >
      {loading ? <span class="bb-button__icon"><Spinner /></span> : leadingIcon && <span class="bb-button__icon"><Icon name={leadingIcon} /></span>}
      {children !== undefined && <span class="bb-button__label">{children}</span>}
      {trailingIcon && <span class="bb-button__icon"><Icon name={trailingIcon} /></span>}
    </button>
  )
}

/** Loading indicator: the icon slot's size, stroked in currentColor. */
function Spinner() {
  return (
    <svg class="bb-button__spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
  )
}
