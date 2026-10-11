import type { ComponentChildren } from 'preact'
import { Button } from '@shared/ui'

export interface ActionBarAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

export interface ActionBarProps {
  summary: ComponentChildren
  secondary?: ActionBarAction
  primary?: ActionBarAction
}

/** The sticky bottom bar on every step: what will happen, then Back / Next. */
export function ActionBar({ summary, secondary, primary }: ActionBarProps) {
  return (
    <div class="bb-publish__actions">
      <p class="bb-publish__summary" aria-live="polite">{summary}</p>
      {secondary && <Button variant="secondary" width="fixed" disabled={secondary.disabled} onClick={secondary.onClick}>{secondary.label}</Button>}
      {primary && <Button variant="primary" width="fixed" disabled={primary.disabled} onClick={primary.onClick}>{primary.label}</Button>}
    </div>
  )
}
