import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './ThinkingStep.css'

export type ThinkingStepStatus = 'done' | 'running'

/** The "Status error icons" variant each Figma Status swaps in. */
const ICON: Record<ThinkingStepStatus, IconName> = { done: 'status-good', running: 'status-retry' }
const STATUS_LABEL: Record<ThinkingStepStatus, string> = { done: 'Done', running: 'Running' }

export interface ThinkingStepProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label'> {
  /** Figma "Status": Done (finished, muted) / Running (in progress, spinning glyph). */
  status?: ThinkingStepStatus
  /** Figma "Label" — what the step did, e.g. "Searched Variables · Brand UI (421)". */
  children?: ComponentChildren
}

/** Figma "Thinking Step" (40000284:8201): one line of the assistant's visible reasoning. */
export function ThinkingStep({ status = 'done', children = 'Searched Variables · Brand UI (421)', class: cls, ...rest }: ThinkingStepProps) {
  return (
    <div {...rest} class={`bb-thinking-step ${cls ?? ''}`} data-status={status} aria-busy={status === 'running' || undefined}>
      <Icon name={ICON[status]} tone={status === 'running' ? 'default' : undefined} title={STATUS_LABEL[status]} class="bb-thinking-step__icon" />
      <span class="bb-thinking-step__label">{children}</span>
    </div>
  )
}
