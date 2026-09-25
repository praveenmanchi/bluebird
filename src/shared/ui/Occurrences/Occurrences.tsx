import type { ComponentChildren, JSX } from 'preact'
import { LinkButton } from '../LinkButton/LinkButton'
import './Occurrences.css'

export interface OccurrencesProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Count" — rendered as "×37". */
  count: number | string
  /** Figma "Label". */
  label?: ComponentChildren
  selectAllLabel?: ComponentChildren
  /** Omit to render the roll-up without its action. */
  onSelectAll?: () => void
}

/** Figma "Occurrences" (40000160:7250): how many layers share one finding, and a way to select them all. */
export function Occurrences({
  count, label = 'affected layers', selectAllLabel = 'Select all', onSelectAll, class: cls, ...rest
}: OccurrencesProps) {
  return (
    <span {...rest} class={`bb-occurrences ${cls ?? ''}`}>
      <span class="bb-occurrences__count">×{count}</span>
      <span class="bb-occurrences__label">{label}</span>
      {onSelectAll && <LinkButton onClick={onSelectAll}>{selectAllLabel}</LinkButton>}
    </span>
  )
}
