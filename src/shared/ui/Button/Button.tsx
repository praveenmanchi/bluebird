import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { Spinner } from '../legacy/ui'
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
      {loading ? <span class="bb-button__icon"><Spinner size={12} /></span> : leadingIcon && <span class="bb-button__icon"><Icon name={leadingIcon} /></span>}
      {children !== undefined && <span class="bb-button__label">{children}</span>}
      {trailingIcon && <span class="bb-button__icon"><Icon name={trailingIcon} /></span>}
    </button>
  )
}
