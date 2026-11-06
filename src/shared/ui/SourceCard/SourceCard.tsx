import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import { Checkbox } from '../Checkbox/Checkbox'
import './SourceCard.css'

export interface SourceCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'name' | 'onToggle'> {
  /** Figma "Name" — the source's title. */
  name?: string
  /** Figma "Meta" — kind, size and modes, e.g. "Variables · 421 tokens · 5 brand modes". */
  meta?: ComponentChildren
  /** Glyph in the Type tile (Figma instance swap; defaults to "variables"). */
  icon?: IconName
  /** Label of the Status Meta Badge (Figma override: "Indexed"). */
  status?: ComponentChildren
  /** Tone of the Status Meta Badge (Figma override: Success). */
  statusTone?: MetaBadgeTone
  /** Include checkbox — whether answers may cite this source (Figma override: Checked). */
  selected?: boolean
  /** Fires with the new value when the Include checkbox is toggled. */
  onToggle?: (selected: boolean) => void
}

/** Figma "Source Card" (40000284:8167): an attached source the user can include in or leave out of answers. */
export function SourceCard({
  name = 'Brand UI variables', meta = 'Variables · 1,026 tokens · 8 brand modes', icon = 'variables',
  status = 'Indexed', statusTone = 'success', selected = true, onToggle, class: cls, ...rest
}: SourceCardProps) {
  return (
    <div {...rest} class={`bb-source-card ${cls ?? ''}`} data-selected={String(selected)}>
      <span class="bb-source-card__type"><Icon name={icon} tone="default" class="bb-source-card__icon" /></span>
      <div class="bb-source-card__text">
        <span class="bb-source-card__name">{name}</span>
        <span class="bb-source-card__meta">{meta}</span>
      </div>
      <MetaBadge tone={statusTone} class="bb-source-card__status">{status}</MetaBadge>
      <Checkbox class="bb-source-card__include" checked={selected} aria-label={`Include ${name}`} onChange={(next) => onToggle?.(next)} />
    </div>
  )
}
