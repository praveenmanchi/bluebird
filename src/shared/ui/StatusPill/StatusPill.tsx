import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './StatusPill.css'

export type StatusPillStatus = 'good' | 'issue' | 'error' | 'retry'

const ICON: Record<StatusPillStatus, IconName> = { good: 'status-good', issue: 'status-issue', error: 'status-error', retry: 'status-retry' }

export interface StatusPillProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Which "Status error icons" glyph leads the pill (the nested instance's Status: Good / Issue / error / Retry). */
  status?: StatusPillStatus
  /** Figma "Status" TEXT property (the "Value" layer). */
  children?: ComponentChildren
}

/** Figma "Buttom Status" (133:1581): a status icon followed by a short label, used in the footer. */
export function StatusPill({ status = 'good', children = 'Value', class: cls, ...rest }: StatusPillProps) {
  return (
    <span {...rest} class={`bb-status-pill ${cls ?? ''}`} data-status={status} role="status">
      <Icon name={ICON[status]} class="bb-status-pill__icon" />
      <span class="bb-status-pill__label">{children}</span>
    </span>
  )
}
