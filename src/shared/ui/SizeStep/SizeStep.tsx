import type { ComponentChildren, JSX } from 'preact'
import './SizeStep.css'

export interface SizeStepProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "State": false = Default (transparent), true = active (brand accent fill). */
  selected?: boolean
  /** The step letter shown in the cell (Figma text layer "L"). */
  label?: ComponentChildren
}

/** Figma "Screen size" (133:1618) — a 16px size step cell (Default / active). */
export function SizeStep({ selected = false, label = 'L', class: cls, ...rest }: SizeStepProps) {
  return (
    <span {...rest} class={`bb-size-step ${cls ?? ''}`} data-selected={selected || undefined} aria-current={selected || undefined}>
      <span class="bb-size-step__label">{label}</span>
    </span>
  )
}
