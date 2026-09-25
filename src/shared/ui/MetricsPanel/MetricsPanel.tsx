import type { ComponentChildren, JSX } from 'preact'
import { MetricCell } from '../MetricCell/MetricCell'
import './MetricsPanel.css'

export interface MetricsPanelMetric {
  label: ComponentChildren
  value: ComponentChildren
}

export interface MetricsPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** One MetricCell per entry, in order. */
  metrics: readonly MetricsPanelMetric[]
}

/** Figma "Metrics Panel" (40000159:7048): the type metrics colour swatches cannot show. */
export function MetricsPanel({ metrics, class: cls, ...rest }: MetricsPanelProps) {
  return (
    <div {...rest} class={`bb-metrics-panel ${cls ?? ''}`}>
      {metrics.map((m, i) => <MetricCell key={i} label={m.label}>{m.value}</MetricCell>)}
    </div>
  )
}
