import type { ComponentChildren, JSX } from 'preact'
import { Mark } from '../Icon/Icon'
import './Step.css'

export type StepState = 'done' | 'current' | 'upcoming'

export interface StepProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Number" — shown in the Index circle for Current and Upcoming. */
  number?: ComponentChildren
  /** Figma "Label". */
  label?: ComponentChildren
  /** Figma "State": Done / Current / Upcoming. */
  state?: StepState
}

/** Figma "Step" (40000275:8141): a numbered circle and label, one stop on the MCP handoff Stepper. */
export function Step({ number = '1', label = 'Select', state = 'done', class: cls, ...rest }: StepProps) {
  const done = state === 'done'
  return (
    <span
      {...rest}
      class={`bb-step ${cls ?? ''}`}
      data-state={state}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      {done
        ? <span class="bb-step__index" role="img" aria-label="Done"><Mark name="check" class="bb-step__mark" /></span>
        : <span class="bb-step__index">{number}</span>}
      <span class="bb-step__label">{label}</span>
    </span>
  )
}
