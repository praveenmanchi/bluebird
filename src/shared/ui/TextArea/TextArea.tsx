import type { ComponentChildren, JSX } from 'preact'
import { useId } from 'preact/hooks'
import './TextArea.css'

export interface TextAreaProps extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'label' | 'value' | 'class'> {
  /** Figma "Label" (+ "Show label" when set). Omit to hide the label. */
  label?: ComponentChildren
  /** Figma "Value" — the current text (controlled). Non-empty = State=Filled. */
  value?: string
  /** Shown while `value` is empty; coloured with input/fg/placeholder (State=Default). */
  placeholder?: string
  /** Figma "Helper" (+ "Show helper" when set) — the line under the field. */
  helperText?: ComponentChildren
  /** Force the Focused visual (stories, visual regression). Real focus comes from :focus-within. */
  state?: 'default' | 'focused'
  /** Fired with the new value on every keystroke. */
  onValueChange?: (value: string) => void
  /** Class applied to the root; the rest of the props go to the native <textarea>. */
  class?: string
}

/** Figma "Text Area" (40000408:8646). A labelled native <textarea> with optional helper text; Input Box chrome on input/* tokens. */
export function TextArea({ label, value, placeholder, helperText, state, disabled, onValueChange, class: cls, id, ...rest }: TextAreaProps) {
  const autoId = useId()
  const fieldId = id ?? `bb-text-area-${autoId}`
  const helperId = `${fieldId}-helper`
  return (
    <div class={`bb-text-area ${cls ?? ''}`} data-state={state} data-disabled={disabled || undefined}>
      {label !== undefined && <label class="bb-text-area__label" for={fieldId}>{label}</label>}
      <textarea
        {...rest}
        id={fieldId}
        class="bb-text-area__field"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={helperText !== undefined ? helperId : undefined}
        onInput={(e) => onValueChange?.((e.currentTarget as HTMLTextAreaElement).value)}
      />
      {helperText !== undefined && <p id={helperId} class="bb-text-area__helper">{helperText}</p>}
    </div>
  )
}
