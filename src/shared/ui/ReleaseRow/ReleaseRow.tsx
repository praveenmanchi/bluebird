import type { JSX } from 'preact'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './ReleaseRow.css'

export type ReleaseRowStatus = 'live' | 'building' | 'failed'

/** The Meta Badge each Status swaps in: Tone + Label. */
const BADGE: Record<ReleaseRowStatus, { tone: MetaBadgeTone; label: string }> = {
  live: { tone: 'success', label: 'Live' },
  building: { tone: 'accent', label: 'Building' },
  failed: { tone: 'danger', label: 'Failed' },
}

export interface ReleaseRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Version". */
  version?: string
  /** Figma "Summary". */
  summary?: string
  /** Figma "Meta". */
  meta?: string
  /** Figma "Status": Live / Building / Failed. */
  status?: ReleaseRowStatus
}

/** Figma "Release Row" (40000345:8635): one published release — version, summary + meta, and a status badge. */
export function ReleaseRow({
  version = 'v2.5.0',
  summary = 'Date picker, darker primary button',
  meta = 'Praveen · 9 Oct · 12 changes',
  status = 'live',
  class: cls,
  ...rest
}: ReleaseRowProps) {
  const badge = BADGE[status]
  return (
    <div {...rest} class={`bb-release-row ${cls ?? ''}`} data-status={status} aria-busy={status === 'building' ? 'true' : undefined}>
      <span class="bb-release-row__version">{version}</span>
      <span class="bb-release-row__text">
        <span class="bb-release-row__summary">{summary}</span>
        <span class="bb-release-row__meta">{meta}</span>
      </span>
      <MetaBadge class="bb-release-row__status" tone={badge.tone}>{badge.label}</MetaBadge>
    </div>
  )
}
