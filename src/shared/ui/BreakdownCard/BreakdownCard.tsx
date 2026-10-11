import type { ComponentChildren, JSX } from 'preact'
import { BreakdownRow, type BreakdownRowProps } from '../BreakdownRow/BreakdownRow'
import './BreakdownCard.css'

export interface BreakdownCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "Title". */
  title?: ComponentChildren
  rows: readonly Pick<BreakdownRowProps, 'tone' | 'label' | 'value'>[]
}

/** Figma "Breakdown Card" (40000447:8687): a titled list of Breakdown Rows. */
export function BreakdownCard({ title = 'By principle', rows, class: cls, ...rest }: BreakdownCardProps) {
  return (
    <div {...rest} class={`bb-breakdown-card ${cls ?? ''}`}>
      <h4 class="bb-breakdown-card__title">{title}</h4>
      {rows.map((r, i) => <BreakdownRow key={i} tone={r.tone} label={r.label} value={r.value} />)}
    </div>
  )
}
