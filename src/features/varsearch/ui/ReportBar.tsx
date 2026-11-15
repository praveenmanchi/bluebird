import { Button } from '@shared/ui'

export interface ReportBarProps {
  /** "2 variables · 3 places · 13 nodes" */
  summary: string
  adding: boolean
  onCopy: () => void
  onAdd: () => void
}

/**
 * Figma "Actions" under Search results (Variable search · 6 Results · Copy and Add to Figma):
 * the search in one line, then Copy (plain text for Jira or Teams) and Add to Figma (the
 * report as a frame on this page). Shown only once a search has results.
 */
export function ReportBar({ summary, adding, onCopy, onAdd }: ReportBarProps) {
  return (
    <div class="bb-varsearch__actions" role="group" aria-label="Search report">
      <p class="bb-varsearch__actions-summary">{summary}</p>
      <div class="bb-varsearch__actions-buttons">
        <Button variant="secondary" leadingIcon="copy" onClick={onCopy}>Copy</Button>
        <Button variant="primary" leadingIcon="ui-sidebar-figma-logo" loading={adding} disabled={adding} onClick={onAdd}>Add to Figma</Button>
      </div>
    </div>
  )
}
