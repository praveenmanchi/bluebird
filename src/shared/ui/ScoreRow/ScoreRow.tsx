import type { ComponentChildren, JSX } from 'preact'
import { ReadinessMeter } from '../ReadinessMeter/ReadinessMeter'
import { ScoreValue, scoreTone } from '../ScoreValue/ScoreValue'
import './ScoreRow.css'

export interface ScoreRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** 0–100, or null before a scan. */
  value?: number | null
  scoreLabel?: ComponentChildren
  /** The meter's label, score text and caption. */
  meterLabel?: ComponentChildren
  meterScore?: ComponentChildren
  caption?: ComponentChildren
}

/** Figma "Score Row" (40000447:8676): Score Value beside a Readiness Meter. */
export function ScoreRow({ value = null, scoreLabel, meterLabel = 'Components passing WCAG 2.2 AA', meterScore, caption, class: cls, ...rest }: ScoreRowProps) {
  const tone = scoreTone(value)
  return (
    <div {...rest} class={`bb-score-row ${cls ?? ''}`} data-tone={tone}>
      <ScoreValue value={value} label={scoreLabel} />
      <ReadinessMeter
        class="bb-score-row__meter"
        tone={tone === 'empty' ? 'warning' : tone}
        value={value ?? 0}
        label={meterLabel}
        score={meterScore}
        caption={caption}
      />
    </div>
  )
}
