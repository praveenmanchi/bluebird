import type { ComponentChildren, JSX } from 'preact'
import { useId } from 'preact/hooks'
import { Icon, type IconName } from '../Icon/Icon'
import './SelectField.css'

export interface SelectFieldProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'label'> {
  /** "Label Title" of the labelled alias set "dropbox" (215:12356). Omit for the bare "dropdown" (215:12201). */
  label?: ComponentChildren
  /** The "Tab Icons" instance shown before the label title in the labelled alias. */
  labelIcon?: IconName
  /** "Label Input label" text. Falls back to `placeholder` (fg/placeholder) when empty. */
  value?: string
  placeholder?: string
  /** "Input bottom label" — a hidden layer in Figma, so off by default. */
  helper?: ComponentChildren
  /** The hidden `eye` instance in Figma (off by default). Shows an eye glyph before the chevron. */
  revealIcon?: boolean
  /** Listbox is open: focus border + chevron flipped. */
  open?: boolean
  /** Force the Hover visuals (stories, visual regression). Real hover comes from :hover. */
  state?: 'default' | 'hover'
}

/**
 * Figma "dropdown" (215:12201) select trigger; with `label` it is the
 * "dropbox" alias (215:12356). The trigger is a real <button aria-haspopup="listbox">.
 */
export function SelectField({ label, labelIcon, value, placeholder = 'Select', helper, revealIcon = false, open = false, state, disabled, class: cls, type = 'button', id, ...rest }: SelectFieldProps) {
  const autoId = useId()
  const triggerId = id ?? `bb-select-field-${autoId}`
  return (
    <div class={`bb-select-field ${cls ?? ''}`} data-open={open || undefined} data-state={state} data-disabled={disabled || undefined}>
      {label !== undefined && (
        <label class="bb-select-field__label" for={triggerId}>
          {labelIcon && <Icon name={labelIcon} class="bb-select-field__label-icon" />}
          <span class="bb-select-field__label-text">{label}</span>
        </label>
      )}
      <button
        {...rest}
        id={triggerId}
        type={type}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        class="bb-select-field__trigger"
      >
        <span class="bb-select-field__value" data-placeholder={value ? undefined : ''}>{value ?? placeholder}</span>
        {revealIcon && <Icon name="eye-open" class="bb-select-field__eye" />}
        <span class="bb-select-field__chevron" aria-hidden="true"><Icon name="chevron-small" /></span>
      </button>
      {helper !== undefined && <span class="bb-select-field__helper">{helper}</span>}
    </div>
  )
}
