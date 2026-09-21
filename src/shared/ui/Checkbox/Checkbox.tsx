import type { ComponentChildren, JSX } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { Mark } from '../Icon/Icon'
import './Checkbox.css'

export type CheckboxChecked = boolean | 'mixed'

export interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange' | 'label'> {
  /** Figma "Selected": false = Unchecked, true = Checked, 'mixed' = Indeterminate. */
  checked?: CheckboxChecked
  /** Figma "Label" (+ "Show label" when set). */
  label?: ComponentChildren
  /** Force the Hover variant (stories, visual regression). */
  state?: 'default' | 'hover'
  onChange?: (checked: boolean) => void
}

/** Figma "Checkbox" (40000046:5237). A real <input> drives a11y; the box and mark are token-driven. */
export function Checkbox({ checked = false, label, state, disabled, onChange, class: cls, ...rest }: CheckboxProps) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (input.current) input.current.indeterminate = checked === 'mixed' }, [checked])
  return (
    <label class={`bb-checkbox ${cls ?? ''}`} data-checked={String(checked)} data-state={state} data-disabled={disabled || undefined}>
      <input
        {...rest}
        ref={input}
        type="checkbox"
        class="bb-checkbox__input"
        checked={checked === true}
        aria-checked={checked === 'mixed' ? 'mixed' : checked}
        disabled={disabled}
        onChange={(e) => onChange?.((e.currentTarget as HTMLInputElement).checked)}
      />
      <span class="bb-checkbox__box" aria-hidden="true">
        {checked === true && <Mark name="check" class="bb-checkbox__mark" />}
        {checked === 'mixed' && <span class="bb-checkbox__dash" style={{ background: 'currentColor' }} />}
      </span>
      {label !== undefined && <span class="bb-checkbox__label">{label}</span>}
    </label>
  )
}
