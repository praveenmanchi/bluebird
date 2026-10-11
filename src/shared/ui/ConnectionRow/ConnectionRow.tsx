import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { LinkButton } from '../LinkButton/LinkButton'
import './ConnectionRow.css'

export type ConnectionRowStatus = 'good' | 'issue' | 'error'

/** "Status error icons" variants; Figma's row uses Good. */
const ICON: Record<ConnectionRowStatus, IconName> = { good: 'status-good', issue: 'status-issue', error: 'status-error' }
const STATUS_LABEL: Record<ConnectionRowStatus, string> = { good: 'Connected', issue: 'Needs attention', error: 'Not connected' }

export interface ConnectionRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'name'> {
  /** Figma "Name". */
  name?: ComponentChildren
  /** Figma "Detail". */
  detail?: ComponentChildren
  /** Figma "Show action" — toggles the Link Button. */
  showAction?: boolean
  /** The Link Button's Label (Figma override "Switch"). */
  actionLabel?: ComponentChildren
  /** Fires when the action link is pressed. */
  onAction?: () => void
  /** The nested Status error icons variant. Figma only draws Good; issue / error reuse the same glyph set for a failing connection. */
  status?: ConnectionRowStatus
}

/** Figma "Connection Row" (40000275:8211): the MCP server the plugin talks to, with a Switch link. */
export function ConnectionRow({
  name = 'Figma MCP server',
  detail = 'Remote · mcp.figma.com/mcp',
  showAction = true,
  actionLabel = 'Switch',
  onAction,
  status = 'good',
  class: cls,
  ...rest
}: ConnectionRowProps) {
  return (
    <div {...rest} class={`bb-connection-row ${cls ?? ''}`} data-status={status}>
      <Icon name={ICON[status]} title={STATUS_LABEL[status]} class="bb-connection-row__icon" />
      <div class="bb-connection-row__text">
        <span class="bb-connection-row__name">{name}</span>
        <span class="bb-connection-row__detail">{detail}</span>
      </div>
      {showAction && <LinkButton class="bb-connection-row__action" onClick={onAction}>{actionLabel}</LinkButton>}
    </div>
  )
}
