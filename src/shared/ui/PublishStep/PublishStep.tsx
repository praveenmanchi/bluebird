import type { JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import { Spinner } from '../Spinner/Spinner'
import './PublishStep.css'

export type PublishStepStatus = 'done' | 'running' | 'queued' | 'failed'

/** Status label read by assistive tech (the indicator's accessible name). */
const STATUS_LABEL: Record<PublishStepStatus, string> = { done: 'Done', running: 'Running', queued: 'Queued', failed: 'Failed' }

export interface PublishStepProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "Title". */
  title?: string
  /** Figma "Detail". */
  detail?: string
  /** Figma "Time". */
  time?: string
  /** Figma "Status": Done / Running / Queued / Failed. */
  status?: PublishStepStatus
}

function Indicator({ status }: { status: PublishStepStatus }) {
  const label = STATUS_LABEL[status]
  if (status === 'running') return <Spinner tone="accent" label={label} class="bb-publish-step__spinner" />
  if (status === 'queued') return <span class="bb-publish-step__ring" role="img" aria-label={label} />
  return <Icon name={status === 'done' ? 'status-good' : 'status-error'} title={label} class="bb-publish-step__icon" />
}

/** Figma "Publish Step" (40000341:8605): one step of a publish run — status indicator, title + detail, elapsed time. */
export function PublishStep({
  title = 'Commit to repository',
  detail = 'praveenmanchi/bridge-ds-site · main · 3f9c2e1',
  time = '12s',
  status = 'done',
  class: cls,
  ...rest
}: PublishStepProps) {
  return (
    <div {...rest} class={`bb-publish-step ${cls ?? ''}`} data-status={status} aria-busy={status === 'running' ? 'true' : undefined}>
      <span class="bb-publish-step__indicator">
        <Indicator status={status} />
      </span>
      <span class="bb-publish-step__text">
        <span class="bb-publish-step__title">{title}</span>
        <span class="bb-publish-step__detail">{detail}</span>
      </span>
      <span class="bb-publish-step__time">{time}</span>
    </div>
  )
}
