import type { ComponentChildren, JSX } from 'preact'
import { useId } from 'preact/hooks'
import './Toggle.css'

export interface ToggleProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title' | 'onChange'> {
  /** Figma "Switch" Status: On / Off. */
  checked?: boolean
  /** Figma "Title" — the label above the description row. Omit to render the bare switch. */
  title?: ComponentChildren
  /** Figma "Descrpition Text" — sits left of the switch. Omit to hide the row text. */
  description?: ComponentChildren
  disabled?: boolean
  /** Accessible name when no `title` is given. */
  label?: string
  onChange?: (checked: boolean) => void
}

/** Figma "Toggle" (215:12515): title, description and a 36×20 switch. The switch is a real role="switch" button. */
export function Toggle({ checked = false, title, description, disabled = false, label, onChange, class: cls, ...rest }: ToggleProps) {
  const id = useId()
  const titleId = title !== undefined ? `bb-toggle-${id}-title` : undefined
  const descId = description !== undefined ? `bb-toggle-${id}-desc` : undefined
  return (
    <div {...rest} class={`bb-toggle ${cls ?? ''}`} data-checked={checked} data-disabled={disabled || undefined}>
      {title !== undefined && <span id={titleId} class="bb-toggle__title">{title}</span>}
      <div class="bb-toggle__row">
        {description !== undefined && <span id={descId} class="bb-toggle__description">{description}</span>}
        <button
          type="button"
          role="switch"
          class="bb-toggle__switch"
          aria-checked={checked}
          aria-labelledby={titleId}
          aria-label={titleId ? undefined : label}
          aria-describedby={descId}
          disabled={disabled}
          onClick={() => { if (!disabled) onChange?.(!checked) }}
        >
          <span class="bb-toggle__knob" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
