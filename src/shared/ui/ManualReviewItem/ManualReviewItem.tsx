import type { ComponentChildren, JSX } from 'preact'
import { Checkbox } from '../Checkbox/Checkbox'
import { DisabilityIndicator, type DisabilityKind } from '../DisabilityIndicator/DisabilityIndicator'
import './ManualReviewItem.css'

export interface ManualReviewItemProps extends Omit<JSX.HTMLAttributes<HTMLLIElement>, 'label' | 'onChange' | 'onToggle'> {
  /** Which discipline owns this check: content / design / code. */
  kind: DisabilityKind
  /** Figma "Label" (exposed from the nested Checkbox). */
  label: ComponentChildren
  /** Figma "Done": Yes / No. */
  done?: boolean
  onToggle?: (done: boolean) => void
}

/** Figma "Manual Review Item" (40000162:7275): one check a machine cannot decide. */
export function ManualReviewItem({ kind, label, done = false, onToggle, class: cls, ...rest }: ManualReviewItemProps) {
  return (
    <li {...rest} class={`bb-manual-review-item ${cls ?? ''}`} data-kind={kind} data-done={done || undefined}>
      <DisabilityIndicator kind={kind} class="bb-manual-review-item__icon" />
      <Checkbox
        checked={done}
        label={label}
        disabled={onToggle === undefined}
        onChange={(next: boolean) => onToggle?.(next)}
      />
    </li>
  )
}
