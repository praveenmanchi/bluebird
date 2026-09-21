import type { JSX } from 'preact'
import './SizeExpander.css'

export type SizeExpanderValue = 'S' | 'M' | 'L'
export const SIZE_EXPANDER_STEPS: readonly SizeExpanderValue[] = ['S', 'M', 'L']

export interface SizeExpanderProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Figma "size expander" is three "Frame 1430102613" (SizeStep) instances; the active step maps to its Variant2 (filled) state. */
  value?: SizeExpanderValue
  /** Figma has no disabled variant; mirrors the parent footer being locked. */
  disabled?: boolean
  /** Accessible name of the group. */
  label?: string
  onChange?: (value: SizeExpanderValue) => void
}

/** Figma "size expander" (133:1628): footer control that steps the plugin window between S / M / L. */
export function SizeExpander({ value, disabled = false, label = 'Plugin size', onChange, class: cls, ...rest }: SizeExpanderProps) {
  return (
    <div {...rest} role="radiogroup" aria-label={label} data-disabled={disabled || undefined} class={`bb-size-expander ${cls ?? ''}`}>
      {SIZE_EXPANDER_STEPS.map((step) => (
        <button
          key={step}
          type="button"
          role="radio"
          aria-checked={value === step}
          disabled={disabled}
          data-selected={value === step || undefined}
          class="bb-size-expander__step"
          onClick={() => { if (!disabled && step !== value) onChange?.(step) }}
        >
          {step}
        </button>
      ))}
    </div>
  )
}
