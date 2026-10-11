import type { JSX } from 'preact'
import './LegendDot.css'

/** The four WCAG principles and the four finding severities. */
export type LegendTone = 'perceivable' | 'operable' | 'understandable' | 'robust' | 'critical' | 'serious' | 'moderate' | 'minor'

export interface LegendDotProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Tone". */
  tone?: LegendTone
}

/** Figma "Legend Dot" (40000446:8622): the colour key at the start of a breakdown row. */
export function LegendDot({ tone = 'perceivable', class: cls, ...rest }: LegendDotProps) {
  return <span aria-hidden="true" {...rest} class={`bb-legend-dot ${cls ?? ''}`} data-tone={tone} />
}
