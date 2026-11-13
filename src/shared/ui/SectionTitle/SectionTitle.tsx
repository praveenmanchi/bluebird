import type { ComponentChildren, JSX } from 'preact'
import { LinkButton } from '../LinkButton/LinkButton'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import './SectionTitle.css'

export interface SectionTitleProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "Title". */
  title?: ComponentChildren
  /** Figma "Show count". */
  showCount?: boolean
  /** Nested "Count" Meta Badge's Label. */
  count?: ComponentChildren
  /** Figma "Show action". */
  showAction?: boolean
  /** Nested "Action" Link Button's Label. */
  actionLabel?: ComponentChildren
  onAction?: () => void
}

/** Figma "Section Title" (40000267:8062): a ticket-detail section heading with a count and an inline action. */
export function SectionTitle({
  title = 'Figma links', showCount = true, count = '2',
  showAction = true, actionLabel = 'Attach link', onAction, class: cls, ...rest
}: SectionTitleProps) {
  return (
    <div {...rest} class={`bb-section-title ${cls ?? ''}`}>
      <div class="bb-section-title__left">
        <h3 class="bb-section-title__title">{title}</h3>
        {showCount && <MetaBadge tone="neutral">{count}</MetaBadge>}
      </div>
      {showAction && <LinkButton onClick={onAction}>{actionLabel}</LinkButton>}
    </div>
  )
}
