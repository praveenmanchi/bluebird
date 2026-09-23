import type { ComponentChildren, JSX } from 'preact'
import { ManualReviewItem } from '../ManualReviewItem/ManualReviewItem'
import type { DisabilityKind } from '../DisabilityIndicator/DisabilityIndicator'
import './ManualReview.css'

export interface ManualReviewCheck {
  /** Which discipline owns this check: content / design / code. */
  kind: DisabilityKind
  label: ComponentChildren
  done?: boolean
}

export interface ManualReviewProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'label' | 'onToggle'> {
  checks: readonly ManualReviewCheck[]
  /** Figma "Label". */
  label?: ComponentChildren
  /** Overrides the generated "1/3". */
  count?: ComponentChildren
  onToggle?: (index: number, done: boolean) => void
}

/** Figma "Manual Review" (40000162:7276): the checks a scanner cannot make for you. */
export function ManualReview({ checks, label = 'Manual review', count, onToggle, class: cls, ...rest }: ManualReviewProps) {
  const done = checks.filter((c) => c.done).length
  return (
    <section {...rest} class={`bb-manual-review ${cls ?? ''}`}>
      <header class="bb-manual-review__header">
        <span class="bb-manual-review__label">{label}</span>
        <span class="bb-manual-review__count">{count ?? `${done}/${checks.length}`}</span>
      </header>
      <ul class="bb-manual-review__list">
        {checks.map((check, i) => (
          <ManualReviewItem
            key={i}
            kind={check.kind}
            label={check.label}
            done={check.done}
            onToggle={onToggle ? (next) => onToggle(i, next) : undefined}
          />
        ))}
      </ul>
    </section>
  )
}
