import type { JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './ConnectionBadge.css'

export type ConnectionStatus = 'retry' | 'good' | 'error'

const ICON: Record<ConnectionStatus, IconName> = { retry: 'status-retry', good: 'status-good', error: 'status-error' }
const LABEL: Record<ConnectionStatus, string> = { retry: 'Connection: retrying', good: 'Connection: good', error: 'Connection: error' }

export interface ConnectionBadgeProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Property 1": Default = retry, Variant2 = good, Variant3 = error (the nested "Status error icons" swap). */
  status?: ConnectionStatus
  /** Accessible name for the badge; defaults to a "Connection: …" phrase per status. */
  label?: string
}

/** Figma "Connection" (417:6735): a bordered 28px badge holding a status icon. */
export function ConnectionBadge({ status = 'retry', label, class: cls, ...rest }: ConnectionBadgeProps) {
  return (
    <span {...rest} class={`bb-connection-badge ${cls ?? ''}`} data-status={status} role="status">
      <Icon name={ICON[status]} class="bb-connection-badge__icon" title={label ?? LABEL[status]} />
    </span>
  )
}
