import type { ComponentChildren, JSX } from 'preact'
import { Button, type ButtonVariant } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import './JiraEmptyState.css'

export type JiraEmptyStateKind = 'no-tickets' | 'not-connected' | 'error'

interface StateCopy {
  title: string
  body: string
  action: string
  variant: ButtonVariant
}

/** Copy and action button per Figma State variant. */
const COPY: Record<JiraEmptyStateKind, StateCopy> = {
  'no-tickets': {
    title: 'You’re all caught up',
    body: 'No open Jira issues are assigned to you in this sprint. Clear the filters to see everything.',
    action: 'Clear filters',
    variant: 'secondary',
  },
  'not-connected': {
    title: 'Connect your Jira site',
    body: 'Add your Atlassian site URL and API token in Settings to pull the tickets assigned to you.',
    action: 'Connect Jira',
    variant: 'primary',
  },
  error: {
    title: 'Couldn’t reach Jira',
    body: 'The Jira API didn’t respond. Check your token or network and try again.',
    action: 'Retry',
    variant: 'secondary',
  },
}

export interface JiraEmptyStateProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "State": No tickets / Not connected / Error. */
  state?: JiraEmptyStateKind
  /** Overrides the state's Title text. */
  title?: ComponentChildren
  /** Overrides the state's Body text. */
  children?: ComponentChildren
  /** Overrides the state's action Button label. */
  actionLabel?: ComponentChildren
  /** The action Button (Clear filters / Connect Jira / Retry). */
  onAction?: () => void
}

/** Figma "Jira Empty State" (40000268:8127): empty / not-connected / error states for the Jira tab. */
export function JiraEmptyState({ state = 'no-tickets', title, children, actionLabel, onAction, class: cls, ...rest }: JiraEmptyStateProps) {
  const copy = COPY[state]
  return (
    <div {...rest} class={`bb-jira-empty-state ${cls ?? ''}`} data-state={state} role={state === 'error' ? 'alert' : undefined}>
      <Icon name="jira" size="lg" tone="default" class="bb-jira-empty-state__icon" />
      <h3 class="bb-jira-empty-state__title">{title ?? copy.title}</h3>
      <p class="bb-jira-empty-state__body">{children ?? copy.body}</p>
      <Button variant={copy.variant} width="fixed" onClick={onAction}>{actionLabel ?? copy.action}</Button>
    </div>
  )
}
