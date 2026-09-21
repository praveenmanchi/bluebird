import type { ComponentChildren, JSX } from 'preact'
import { ChangeStatus, type ChangeStatusKind } from '../ChangeStatus/ChangeStatus'
import { Icon, type IconName } from '../Icon/Icon'
import { VariableCard, type VariableCardKind } from '../VariableCard/VariableCard'
import './VariableCardExpanded.css'

export interface VariableCardRow {
  /** Component name (Figma text "Button"). */
  label: ComponentChildren
  /** Count shown in the row's change-status chip (Frame 1430102572). */
  value: number | string
  /** Caption of the row chip; defaults to the ChangeStatus caption for `status`. */
  valueLabel?: ComponentChildren
  /** Status of the row chip; defaults to Updated (Figma Property 1=Default). */
  status?: ChangeStatusKind
  /** Leading glyph (Figma instance "multiple component 3"). */
  icon?: IconName
}

export interface VariableCardSummary {
  /** Caption of a summary chip in the section row (Frame 1430102678). */
  label: ComponentChildren
  count: number | string
  status?: ChangeStatusKind
}

export interface VariableCardExpandedProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'name' | 'rows'> {
  /** Header: the variable / style name (Figma text "Color/Border/Black"). */
  name: ComponentChildren
  /** Header: the second line (Figma text "Universal Toolkit · Used by 52 components · Affects 1 mode/brands"). */
  meta?: ComponentChildren
  /** Header glyph; mirrors VariableCard `kind`. */
  kind?: VariableCardKind
  /** Header chip count (Frame 1430102562). */
  changeCount?: number | string
  /** Section title (Figma text "Components Using the Searched Variable"). */
  sectionTitle?: ComponentChildren
  /** Summary chips on the right of the section title (two change-status instances in Figma). */
  summary?: readonly VariableCardSummary[]
  /** Detail rows (five "Frame 14301025xx" rows in Figma). */
  rows: readonly VariableCardRow[]
  /** Fired by the header chevron (Tab Icon "Dropdown- down", pointing up while expanded). */
  onCollapse?: () => void
  /** Fired by the header research action. */
  onInspect?: JSX.MouseEventHandler<HTMLButtonElement>
  /** Fired by a row's "show" action. */
  onShow?: (row: VariableCardRow, index: number) => void
  /** Fired by a row's "layers show" action. */
  onShowLayers?: (row: VariableCardRow, index: number) => void
}

/**
 * Figma "Variable search card expand" (84:1043): the expanded state of
 * VariableCard. The header row is the composed VariableCard (flattened to a
 * divider), followed by the "Components Using the Searched Variable" section
 * and one detail row per component with a chip and layers-show / show actions.
 */
export function VariableCardExpanded({
  name,
  meta,
  kind = 'variable',
  changeCount = 52,
  sectionTitle = 'Components Using the Searched Variable',
  summary = [],
  rows,
  onCollapse,
  onInspect,
  onShow,
  onShowLayers,
  class: cls,
  ...rest
}: VariableCardExpandedProps) {
  return (
    <section {...rest} class={`bb-variable-card-expanded ${cls ?? ''}`} data-kind={kind}>
      <VariableCard
        class="bb-variable-card-expanded__header"
        kind={kind}
        name={name}
        meta={meta}
        changeCount={changeCount}
        expanded
        onToggle={() => onCollapse?.()}
        onInspect={onInspect}
      />
      <div class="bb-variable-card-expanded__section">
        <h4 class="bb-variable-card-expanded__title">{sectionTitle}</h4>
        {summary.length > 0 && (
          <div class="bb-variable-card-expanded__summary">
            {summary.map((chip, i) => (
              <ChangeStatus key={i} status={chip.status ?? 'updated'} label={chip.label} count={chip.count} class="bb-variable-card-expanded__chip" />
            ))}
          </div>
        )}
      </div>
      <ul class="bb-variable-card-expanded__rows">
        {rows.map((row, i) => {
          const rowName = typeof row.label === 'string' ? row.label : `row ${i + 1}`
          return (
            <li key={i} class="bb-variable-card-expanded__row">
              <span class="bb-variable-card-expanded__component">
                <Icon name={row.icon ?? 'multiple-component'} class="bb-variable-card-expanded__glyph" />
                <span class="bb-variable-card-expanded__label">{row.label}</span>
              </span>
              <span class="bb-variable-card-expanded__actions">
                <ChangeStatus status={row.status ?? 'updated'} label={row.valueLabel} count={row.value} class="bb-variable-card-expanded__chip" />
                <button type="button" class="bb-variable-card-expanded__action" aria-label={`Show layers of ${rowName}`} onClick={() => onShowLayers?.(row, i)}>
                  <Icon name="layers-show" />
                </button>
                <button type="button" class="bb-variable-card-expanded__action" aria-label={`Show ${rowName}`} onClick={() => onShow?.(row, i)}>
                  <Icon name="show" />
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
