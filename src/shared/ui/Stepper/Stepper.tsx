import type { ComponentChildren, JSX } from 'preact'
import { Step, type StepState } from '../Step/Step'
import './Stepper.css'

export interface StepperStep {
  /** The Step's Figma "Label". */
  label: ComponentChildren
  /** The Step's Figma "Number"; defaults to the 1-based position. */
  number?: ComponentChildren
}

/** Figma's Stepper: Select (Done) → Check (Done) → Generate (Current) → Ship (Upcoming). */
export const DEFAULT_STEPS: readonly StepperStep[] = [
  { label: 'Select' },
  { label: 'Check' },
  { label: 'Generate' },
  { label: 'Ship' },
]

export interface StepperProps extends JSX.HTMLAttributes<HTMLOListElement> {
  /** One entry per nested Step instance, in order. */
  steps?: readonly StepperStep[]
  /** 0-based index of the Current step; earlier steps are Done, later ones Upcoming. Past the end = all Done. */
  current?: number
}

export function stepState(index: number, current: number): StepState {
  if (index < current) return 'done'
  return index === current ? 'current' : 'upcoming'
}

/** Figma "Stepper" (40000275:8142): Step instances joined by FILL connectors. */
export function Stepper({ steps = DEFAULT_STEPS, current = 2, class: cls, ...rest }: StepperProps) {
  return (
    <ol {...rest} class={`bb-stepper ${cls ?? ''}`}>
      {steps.map((step, i) => (
        <li key={i} class="bb-stepper__item" data-first={i === 0 || undefined}>
          {i > 0 && <span class="bb-stepper__connector" aria-hidden="true" />}
          <Step number={step.number ?? String(i + 1)} label={step.label} state={stepState(i, current)} />
        </li>
      ))}
    </ol>
  )
}
