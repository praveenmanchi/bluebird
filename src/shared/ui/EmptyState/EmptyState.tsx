import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './EmptyState.css'

export interface EmptyStateProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title' | 'icon'> {
  icon?: IconName
  title: ComponentChildren
  description?: ComponentChildren
  hint?: ComponentChildren
}

/**
 * Empty state on the `empty-state/*` Brand tokens. There is no Figma component
 * set for it yet, so it is not part of the drift gate's set coverage; every
 * value it draws is still a token.
 */
export function EmptyState({ icon, title, description, hint, class: cls, ...rest }: EmptyStateProps) {
  return (
    <div {...rest} class={`bb-empty-state ${cls ?? ''}`} role="status">
      {icon && <Icon name={icon} class="bb-empty-state__icon" />}
      <p class="bb-empty-state__title">{title}</p>
      {description && <p class="bb-empty-state__body">{description}</p>}
      {hint && <p class="bb-empty-state__hint">{hint}</p>}
    </div>
  )
}
