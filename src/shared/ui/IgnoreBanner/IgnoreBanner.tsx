import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import { LinkButton } from '../LinkButton/LinkButton'
import './IgnoreBanner.css'

export interface IgnoreBannerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Reason" — why the finding was waved through. */
  reason?: ComponentChildren
  /** Figma "Scope" — how far the ignore reaches. */
  scope?: ComponentChildren
  /** Figma "Author". */
  author?: ComponentChildren
  /** Figma "Expires". */
  expires?: ComponentChildren
  undoLabel?: ComponentChildren
  onUndo?: () => void
}

/** Figma "Ignore Banner" (40000160:7255): a recorded exemption — why, how far, who, until when. */
export function IgnoreBanner({
  reason = 'Ignored without a reason', scope, author, expires,
  undoLabel = 'Restore', onUndo, class: cls, ...rest
}: IgnoreBannerProps) {
  const meta = [scope, author, expires].filter((m) => m !== undefined)
  return (
    <div {...rest} class={`bb-ignore-banner ${cls ?? ''}`} role="note">
      <Icon name="eye-close" class="bb-ignore-banner__icon" />
      <div class="bb-ignore-banner__body">
        <p class="bb-ignore-banner__reason">{reason}</p>
        {meta.length > 0 && (
          <p class="bb-ignore-banner__meta">
            {meta.map((m, i) => <span key={i} class="bb-ignore-banner__meta-item">{m}</span>)}
          </p>
        )}
      </div>
      {onUndo && <LinkButton onClick={onUndo}>{undoLabel}</LinkButton>}
    </div>
  )
}
