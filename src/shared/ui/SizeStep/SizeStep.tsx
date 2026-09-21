import type { ComponentChildren, JSX } from 'preact'
import './SizeStep.css'

export interface SizeStepProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Property 1": false = Default (transparent), true = Variant2 (filled step). */
  selected?: boolean
  /** The step letter shown in the cell (Figma text layer "L"). */
  label?: ComponentChildren
}

/** Figma "Frame 1430102613" (133:1618) — a 16px size step cell (Default / Variant2). */
export function SizeStep({ selected = false, label = 'L', class: cls, ...rest }: SizeStepProps) {
  return (
    <span {...rest} class={`bb-size-step ${cls ?? ''}`} data-selected={selected || undefined} aria-current={selected || undefined}>
      <span class="bb-size-step__label">{label}</span>
    </span>
  )
}
