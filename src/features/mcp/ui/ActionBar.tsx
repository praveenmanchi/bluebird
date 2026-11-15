import type { ComponentChildren } from 'preact'
import { Button } from '@shared/ui'
import { notice } from '../state'

export interface ActionBarAction {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}

export interface ActionBarProps {
  summary: ComponentChildren
  /** Secondary buttons, in Figma order (e.g. Copy prompt, Back). */
  secondary?: readonly ActionBarAction[]
  primary?: ActionBarAction
}

/** Figma "Actions": the sticky bar under every step — what happens next (or the last action's outcome), then Back / Next. */
export function ActionBar({ summary, secondary = [], primary }: ActionBarProps) {
  return (
    <div class="bb-mcp-handoff__actions">
      <p class="bb-mcp-handoff__summary" role="status">{notice.value ?? summary}</p>
      <div class="bb-mcp-handoff__buttons">
        {secondary.map((a) => (
          <Button key={a.label} variant="secondary" disabled={a.disabled} onClick={a.onClick}>{a.label}</Button>
        ))}
        {primary && <Button variant="primary" disabled={primary.disabled} loading={primary.loading} onClick={primary.onClick}>{primary.label}</Button>}
      </div>
    </div>
  )
}
