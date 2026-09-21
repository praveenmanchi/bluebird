import type { ComponentChildren, JSX } from 'preact'
import { useId, useState } from 'preact/hooks'
import { Icon, type IconName } from '../Icon/Icon'
import './Input.css'

export interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'label' | 'icon' | 'value' | 'type' | 'size'> {
  /** Figma "Title " — the label above the field. */
  label?: ComponentChildren
  /** Figma "Title icon" (+ the "Tab Icons" instance swapped in). Omit to hide the leading label icon. */
  icon?: IconName
  /** Figma "Eye " — renders the eye toggle and masks the value as a password until revealed. */
  password?: boolean
  /** Figma "Input Text" — the current value (controlled). */
  value?: string
  /** Shown while `value` is empty; coloured with input/fg/placeholder. */
  placeholder?: string
  /** Figma "Buttom Text " (+ "Buttom Text" boolean when set) — helper text under the field. */
  helperText?: ComponentChildren
  /** Turns the border to input/border/error and marks the control aria-invalid. */
  error?: boolean
  /** Force the focus visual (stories, visual regression). Real focus comes from :focus-within. */
  state?: 'default' | 'focus'
  /** Fired with the new value on every keystroke. */
  onValueChange?: (value: string) => void
  /** Class applied to the root; the rest of the props go to the native <input>. */
  class?: string
}

/** Figma "Input Box" (204:9667). A labelled native <input> with optional leading icon, password eye and helper text. */
export function Input({ label, icon, password = false, value, placeholder, helperText, error = false, state, disabled, onValueChange, class: cls, id, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? `bb-input-${autoId}`
  const helperId = `${inputId}-helper`
  const [revealed, setRevealed] = useState(false)
  const masked = password && !revealed
  return (
    <div class={`bb-input ${cls ?? ''}`} data-state={state} data-disabled={disabled || undefined} data-error={error || undefined} data-password={password || undefined}>
      {label !== undefined && (
        <label class="bb-input__label" for={inputId}>
          {icon && <span class="bb-input__label-icon"><Icon name={icon} /></span>}
          <span class="bb-input__label-text">{label}</span>
        </label>
      )}
      <div class="bb-input__field">
        <div class="bb-input__box">
          <input
            {...rest}
            id={inputId}
            type={masked ? 'password' : 'text'}
            class="bb-input__control"
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={helperText !== undefined ? helperId : undefined}
            onInput={(e) => onValueChange?.((e.currentTarget as HTMLInputElement).value)}
          />
          {password && (
            <button
              type="button"
              class="bb-input__eye"
              aria-label={revealed ? 'Hide value' : 'Show value'}
              aria-pressed={revealed}
              disabled={disabled}
              onClick={() => setRevealed((r) => !r)}
            >
              <Icon name={revealed ? 'eye-close' : 'eye-open'} />
            </button>
          )}
        </div>
      </div>
      {helperText !== undefined && <p id={helperId} class="bb-input__helper">{helperText}</p>}
    </div>
  )
}
