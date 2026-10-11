import type { ComponentChildren, JSX } from 'preact'
import { useId, useState } from 'preact/hooks'
import { Icon } from '../Icon/Icon'
import './AccessCodeField.css'

export type AccessCodeFieldStatus = 'error' | 'success'
/** Figma "State". Real focus comes from :focus-within; `state` only forces the look (stories). */
export type AccessCodeFieldState = 'default' | 'focused' | 'filled' | 'error' | 'success' | 'disabled'

type InputAttrs = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'type' | 'class' | 'label' | 'size' | 'onInput'>

export interface AccessCodeFieldProps extends InputAttrs {
  /** Figma "Label". */
  label?: ComponentChildren
  /** Figma "Show helper". */
  showHelper?: boolean
  value?: string
  onValueChange?: (value: string) => void
  /** Error / Success: status glyph, coloured border, leading icon and helper. */
  status?: AccessCodeFieldStatus
  /** Disabled = the code is being checked. */
  disabled?: boolean
  /** Helper copy; defaults to the Figma text for the current state. */
  helperText?: ComponentChildren
  /** Force a Figma state's look (stories / visual regression). */
  state?: AccessCodeFieldState
  class?: string
}

const HELPER = {
  default: 'Codes look like TEAM-2026 and aren’t case-sensitive.',
  error: 'That code didn’t work. Check for typos — 4 attempts left.',
  success: 'Code accepted. Opening Design studio…',
  disabled: 'Checking your code…',
} as const

/** Figma "Access Code Field" (40000321:20076): the masked access-code input with a reveal toggle. */
export function AccessCodeField({
  label = 'Access code', showHelper = true, value = '', onValueChange, status, disabled = false, helperText, state,
  placeholder = 'Enter your access code', class: cls, id, ...rest
}: AccessCodeFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const autoId = useId()
  const inputId = id ?? `bb-access-code-${autoId}`
  const helperId = `${inputId}-helper`
  const forced = state === 'error' || state === 'success' ? state : undefined
  const tone = forced ?? status
  const isDisabled = disabled || state === 'disabled'
  const helperKey = isDisabled ? 'disabled' : tone ?? 'default'

  return (
    <div class={`bb-access-code-field ${cls ?? ''}`} data-status={tone} data-disabled={isDisabled || undefined} data-state={state}>
      <label class="bb-access-code-field__label" for={inputId}>{label}</label>
      <div class="bb-access-code-field__box">
        <Icon name="api-key" class="bb-access-code-field__lead" />
        <input
          {...rest}
          id={inputId}
          class="bb-access-code-field__input"
          type={revealed ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          disabled={isDisabled}
          autoComplete="off"
          autoCapitalize="characters"
          spellcheck={false}
          aria-invalid={tone === 'error' || undefined}
          aria-describedby={showHelper ? helperId : undefined}
          onInput={(e) => onValueChange?.(e.currentTarget.value)}
        />
        {tone && <Icon name={tone === 'error' ? 'status-error' : 'status-good'} class="bb-access-code-field__status" />}
        <button
          type="button"
          class="bb-access-code-field__reveal"
          aria-label={revealed ? 'Hide access code' : 'Show access code'}
          aria-pressed={revealed}
          aria-controls={inputId}
          disabled={isDisabled}
          onClick={() => setRevealed((r) => !r)}
        >
          <Icon name={revealed ? 'eye-open' : 'eye-close'} />
        </button>
      </div>
      {showHelper && <p id={helperId} class="bb-access-code-field__helper" aria-live="polite">{helperText ?? HELPER[helperKey]}</p>}
    </div>
  )
}
