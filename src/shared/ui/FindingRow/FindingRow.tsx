import type { ComponentChildren, JSX } from 'preact'
import { ContextChip } from '../ContextChip/ContextChip'
import { LinkButton } from '../LinkButton/LinkButton'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './FindingRow.css'

export type FindingSeverity = 'critical' | 'serious' | 'moderate' | 'minor'
export type FindingAction = 'locate' | 'ignore' | 'apply'

/** The Meta Badge each Figma Severity variant uses. */
const SEVERITY: Record<FindingSeverity, { tone: MetaBadgeTone; label: string }> = {
  critical: { tone: 'danger', label: 'CRITICAL' },
  serious: { tone: 'warning', label: 'SERIOUS' },
  moderate: { tone: 'accent', label: 'MODERATE' },
  minor: { tone: 'neutral', label: 'MINOR' },
}

/** The three Link Button instances, in Figma order. */
const ACTIONS: readonly { action: FindingAction; label: string }[] = [
  { action: 'locate', label: 'Locate' },
  { action: 'ignore', label: 'Ignore' },
  { action: 'apply', label: 'Apply fix' },
]

export interface FindingRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title' | 'onSelect'> {
  /** Figma "Severity": Critical / Serious / Moderate / Minor (drives the Meta Badge tone and word). */
  severity?: FindingSeverity
  /** Figma "Title". */
  title?: ComponentChildren
  /** Figma "Meta" — rule · layer path · brand mode. */
  meta?: ComponentChildren
  /** The "Fix" Context Chip (Citation) label — the suggested token swap. Pass null to hide it. */
  fix?: ComponentChildren
  /** Title pressed: select the finding (e.g. open its detail). Renders the title as a button. */
  onSelect?: () => void
  /** One of the Locate / Ignore / Apply fix link buttons pressed. */
  onAction?: (action: FindingAction) => void
  /** Which link buttons show, for a list that cannot do all three. Defaults to every one, like the Figma component. */
  actions?: readonly FindingAction[]
}

/** Figma "Finding Row" (40000296:8483): one issue an agent found, with its fix and the actions on it. */
export function FindingRow({
  severity = 'critical',
  title = 'Key text is 2.9:1 on the selected row — needs 4.5:1',
  meta = 'WCAG 1.4.3 · Ticket Row › Key · Ikea mode',
  fix = 'Fix: jira/text/key → text/primary (7.8:1)',
  onSelect, onAction, actions, class: cls, ...rest
}: FindingRowProps) {
  const badge = SEVERITY[severity]
  return (
    <div {...rest} class={`bb-finding-row ${cls ?? ''}`} data-severity={severity}>
      <MetaBadge tone={badge.tone} class="bb-finding-row__severity">{badge.label}</MetaBadge>
      <div class="bb-finding-row__text">
        {onSelect
          ? <button type="button" class="bb-finding-row__title" onClick={onSelect}>{title}</button>
          : <span class="bb-finding-row__title">{title}</span>}
        <span class="bb-finding-row__meta">{meta}</span>
        {fix !== null && fix !== undefined && <ContextChip type="citation" class="bb-finding-row__fix">{fix}</ContextChip>}
      </div>
      <div class="bb-finding-row__actions">
        {ACTIONS.filter(({ action }) => !actions || actions.includes(action)).map(({ action, label }) => (
          <LinkButton key={action} data-action={action} onClick={() => onAction?.(action)}>{label}</LinkButton>
        ))}
      </div>
    </div>
  )
}
