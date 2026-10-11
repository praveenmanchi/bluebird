import type { ComponentChildren, JSX } from 'preact'
import { DisclosureToggle } from '../DisclosureToggle/DisclosureToggle'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './SummaryHeader.css'

export interface SummaryHeaderProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title' | 'onToggle'> {
  /** Figma "Title". */
  title?: ComponentChildren
  /** Figma "Stats". */
  stats?: ComponentChildren
  /** The exposed Status Meta Badge. Omit to hide it. */
  status?: { tone: MetaBadgeTone; label: ComponentChildren }
  /** The exposed Disclosure Toggle. Omit `onToggle` to hide it. */
  expanded?: boolean
  onToggle?: (expanded: boolean) => void
  /** id of the region the toggle shows and hides. */
  controls?: string
}

/** Figma "Summary Header" (40000447:8665): title, status badge, scan stats, Show/Hide details. */
export function SummaryHeader({ title = 'Scan summary', stats, status, expanded = false, onToggle, controls, class: cls, ...rest }: SummaryHeaderProps) {
  return (
    <div {...rest} class={`bb-summary-header ${cls ?? ''}`}>
      <h3 class="bb-summary-header__title">{title}</h3>
      {status && <MetaBadge tone={status.tone}>{status.label}</MetaBadge>}
      {stats !== undefined && <span class="bb-summary-header__stats">{stats}</span>}
      {onToggle && <DisclosureToggle class="bb-summary-header__toggle" expanded={expanded} onToggle={onToggle} aria-controls={controls} />}
    </div>
  )
}
