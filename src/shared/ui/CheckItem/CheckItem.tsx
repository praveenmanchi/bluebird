import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { LinkButton } from '../LinkButton/LinkButton'
import './CheckItem.css'

export type CheckItemStatus = 'pass' | 'warning' | 'fail'

/** The "Status error icons" variant each Status swaps in: Good / issue / error. */
const ICON: Record<CheckItemStatus, IconName> = { pass: 'status-good', warning: 'status-issue', fail: 'status-error' }
const STATUS_LABEL: Record<CheckItemStatus, string> = { pass: 'Pass', warning: 'Warning', fail: 'Fail' }

export interface CheckItemProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "Status": Pass / Warning / Fail. */
  status?: CheckItemStatus
  /** Figma "Title". */
  title?: ComponentChildren
  /** Figma "Detail". */
  detail?: ComponentChildren
  /** Figma hides the Action (Link Button) in Status=Pass and shows it otherwise; override here. */
  showAction?: boolean
  /** The Link Button's Label (Figma override "Fix"). */
  actionLabel?: ComponentChildren
  /** Fires when the Action link is pressed. */
  onAction?: () => void
}

/** Figma "Check Item" (40000275:8210): one pre-flight check — status glyph, title and detail, and a Fix link when it is not passing. */
export function CheckItem({
  status = 'pass',
  title = 'Variables',
  detail = '98% of fills, strokes, spacing and type are bound to Brand UI',
  showAction = status !== 'pass',
  actionLabel = 'Fix',
  onAction,
  class: cls,
  ...rest
}: CheckItemProps) {
  return (
    <div {...rest} class={`bb-check-item ${cls ?? ''}`} data-status={status}>
      <Icon name={ICON[status]} title={STATUS_LABEL[status]} class="bb-check-item__icon" />
      <div class="bb-check-item__text">
        <span class="bb-check-item__title">{title}</span>
        <span class="bb-check-item__detail">{detail}</span>
      </div>
      {showAction && <LinkButton class="bb-check-item__action" onClick={onAction}>{actionLabel}</LinkButton>}
    </div>
  )
}
