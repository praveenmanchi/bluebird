import type { ComponentChildren, JSX } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { LinkButton } from '../LinkButton/LinkButton'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import { TicketRow } from '../TicketRow/TicketRow'
import './SelectionPreview.css'

export interface SelectionStat {
  label: ComponentChildren
  tone?: MetaBadgeTone
}

export interface SelectionPreviewProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Figma "Name" — the selected layer. */
  name?: ComponentChildren
  /** Figma "Meta" — kind · variant · where it lives. */
  meta?: ComponentChildren
  /** The three Meta Badges under the meta line. */
  stats?: readonly SelectionStat[]
  /** The thumbnail of the selection. Defaults to the Ticket Row the Figma mock-up shows. */
  children?: ComponentChildren
  /** The "Select on canvas" Link Button label. */
  actionLabel?: ComponentChildren
  onSelectOnCanvas?: () => void
}

const DEFAULT_STATS: readonly SelectionStat[] = [
  { label: '16 variables', tone: 'accent' },
  { label: '6 components', tone: 'neutral' },
  { label: '0 raw values', tone: 'success' },
]

/** Figma scales the thumbnail instance; the ratio survives in the snapshot as its scaled stroke
 *  (selection-preview ticket-row stroke ÷ the Ticket Row's own stroke), so read it from there. */
function figmaScale(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const scaled = parseFloat(style.getPropertyValue('--bb-jira-border-width'))
  const natural = parseFloat(style.getPropertyValue('--bb-jira-border-width'))
  return scaled > 0 && natural > 0 ? scaled / natural : 1
}

/** Figma "Selection Preview" (40000287:8278): what the user has selected, as UX AI context. */
export function SelectionPreview({
  name = 'Ticket Row',
  meta = 'Component · State=Selected · Components › Jira',
  stats = DEFAULT_STATS,
  children,
  actionLabel = 'Select on canvas',
  onSelectOnCanvas,
  class: cls, ...rest
}: SelectionPreviewProps) {
  const thumb = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = thumb.current
    if (el) el.style.setProperty('--selection-preview-scale', String(figmaScale(el)))
  }, [])
  return (
    <section {...rest} class={`bb-selection-preview ${cls ?? ''}`} aria-label="Selection">
      <div class="bb-selection-preview__preview" aria-hidden="true">
        <div class="bb-selection-preview__thumb" ref={thumb} inert>
          {children ?? <TicketRow selected issueKey="BB-142" title="Follow the updated WCAG card set in the accessibility tab" tabIndex={-1} />}
        </div>
      </div>
      <div class="bb-selection-preview__text">
        <p class="bb-selection-preview__name">{name}</p>
        <p class="bb-selection-preview__meta">{meta}</p>
        {stats.length > 0 && (
          <div class="bb-selection-preview__stats">
            {stats.map((s, i) => <MetaBadge key={i} tone={s.tone ?? 'neutral'}>{s.label}</MetaBadge>)}
          </div>
        )}
        <LinkButton onClick={onSelectOnCanvas}>{actionLabel}</LinkButton>
      </div>
    </section>
  )
}
