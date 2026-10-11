import type { ComponentChildren, JSX } from 'preact'
import './ScoreValue.css'

export type ScoreTone = 'success' | 'warning' | 'danger' | 'empty'

/** Figma's thresholds: ≥80 Success, ≥60 Warning, else Danger; no score is Empty. */
export function scoreTone(score: number | null | undefined): ScoreTone {
  if (score === null || score === undefined || !Number.isFinite(score)) return 'empty'
  return score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'
}

export interface ScoreValueProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Tone"; derived from `value` when omitted. */
  tone?: ScoreTone
  /** 0–100, or null before a scan. */
  value?: number | null
  /** Figma "Score"; defaults to `${value}%` or "—". */
  score?: ComponentChildren
  /** Figma "Label". */
  label?: ComponentChildren
}

/** Figma "Score Value" (40000446:8644): the headline accessibility score. */
export function ScoreValue({ tone, value = null, score, label = 'accessible', class: cls, ...rest }: ScoreValueProps) {
  const t = tone ?? scoreTone(value)
  return (
    <div {...rest} class={`bb-score-value ${cls ?? ''}`} data-tone={t}>
      <span class="bb-score-value__score">{score ?? (value === null ? '—' : `${Math.round(value)}%`)}</span>
      <span class="bb-score-value__label">{label}</span>
    </div>
  )
}
