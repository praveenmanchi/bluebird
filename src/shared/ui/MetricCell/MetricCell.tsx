import type { ComponentChildren, JSX } from 'preact'
import './MetricCell.css'

export interface MetricCellProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label'> {
  /** Figma "Label" — what is being measured. */
  label: ComponentChildren
  /** Figma "Value" — the measurement. */
  children?: ComponentChildren
}

/** Figma "Metric Cell" (40000157:7207): one labelled measurement in a metrics panel. */
export function MetricCell({ label, children, class: cls, ...rest }: MetricCellProps) {
  return (
    <div {...rest} class={`bb-metric-cell ${cls ?? ''}`}>
      <span class="bb-metric-cell__label">{label}</span>
      <span class="bb-metric-cell__value">{children}</span>
    </div>
  )
}
