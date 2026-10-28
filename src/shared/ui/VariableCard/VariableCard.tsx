import type { ComponentChildren, JSX } from 'preact'
import { ChangeStatus, type ChangeStatusKind } from '../ChangeStatus/ChangeStatus'
import { Icon } from '../Icon/Icon'
import './VariableCard.css'

export type VariableCardKind = 'variable' | 'text-style'

export interface VariableCardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'name' | 'onToggle'> {
  /** Figma "Property 1": variable (Variables glyph) / text style (text glyph). */
  kind?: VariableCardKind
  /** The variable / style name (Figma text "Color/Border/Black"). */
  name: ComponentChildren
  /** The second line (Figma text "Universal Toolkit · Used by 52 components · Affects 1 mode/brands"). */
  meta?: ComponentChildren
  /** The faded timestamp (Figma text "12 Days ago"). Omit to hide it. */
  updated?: ComponentChildren
  /** Count in the composed "change status" instance (Frame 1430102562). */
  changeCount?: number | string
  /** Status of the composed "change status" instance; defaults to Updated (Figma Property 1=Default). */
  changeStatus?: ChangeStatusKind
  /** Caption of the composed "change status" instance. Figma overrides it to "Usage No." in both variants;
   *  pass e.g. "Added" to show a diff caption instead. */
  changeLabel?: ComponentChildren
  /** Whether the row is expanded: flips the chevron (dropdown-down → dropdown-up) and aria-expanded. */
  expanded?: boolean
  /** Fired by the chevron (Tab Icon "Dropdown- down"). */
  onToggle?: (expanded: boolean) => void
  /** Fired by the research icon action (Tab Icon "Research"). */
  onInspect?: JSX.MouseEventHandler<HTMLButtonElement>
  /** Extra trailing content before the icon actions (used by VariableCardExpanded). */
  trailing?: ComponentChildren
}

const GLYPH: Record<VariableCardKind, 'ui-variable-color' | 'text'> = { variable: 'ui-variable-color', 'text-style': 'text' }

/**
 * Figma "Variable search card" (83:940): a collapsed search-result row —
 * Tab Icon, name + meta stack, then the timestamp, a change-status chip and
 * the research / dropdown icon actions.
 */
export function VariableCard({ kind = 'variable', name, meta, updated, changeCount = 52, changeStatus = 'updated', changeLabel = 'Usage No.', expanded = false, onToggle, onInspect, trailing, class: cls, ...rest }: VariableCardProps) {
  return (
    <article {...rest} class={`bb-variable-card ${cls ?? ''}`} data-kind={kind} data-expanded={expanded || undefined}>
      <div class="bb-variable-card__lead">
        <Icon name={GLYPH[kind]} class="bb-variable-card__glyph" />
        <div class="bb-variable-card__stack">
          <span class="bb-variable-card__name">{name}</span>
          {meta !== undefined && <span class="bb-variable-card__meta">{meta}</span>}
        </div>
      </div>
      <div class="bb-variable-card__trail">
        {updated !== undefined && <span class="bb-variable-card__updated">{updated}</span>}
        <ChangeStatus status={changeStatus} label={changeLabel} count={changeCount} class="bb-variable-card__status" />
        {trailing}
        <button type="button" class="bb-variable-card__action" aria-label="Inspect" onClick={onInspect}>
          <Icon name="research" />
        </button>
        <button type="button" class="bb-variable-card__action" aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded} onClick={() => onToggle?.(!expanded)}>
          <Icon name={expanded ? 'dropdown-up' : 'dropdown-down'} />
        </button>
      </div>
    </article>
  )
}
