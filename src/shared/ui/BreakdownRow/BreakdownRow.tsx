import type { ComponentChildren, JSX } from 'preact'
import { LegendDot, type LegendTone } from '../LegendDot/LegendDot'
import './BreakdownRow.css'

export interface BreakdownRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The nested Legend Dot's Tone. */
  tone?: LegendTone
  /** Figma "Label". */
  label?: ComponentChildren
  /** Figma "Value". */
  value?: ComponentChildren
}

/** Figma "Breakdown Row" (40000447:8613): colour key, name, count. */
export function BreakdownRow({ tone = 'perceivable', label = 'Perceivable', value = '19', class: cls, ...rest }: BreakdownRowProps) {
  return (
    <div {...rest} class={`bb-breakdown-row ${cls ?? ''}`}>
      <LegendDot tone={tone} />
      <span class="bb-breakdown-row__label">{label}</span>
      <span class="bb-breakdown-row__value">{value}</span>
    </div>
  )
}
