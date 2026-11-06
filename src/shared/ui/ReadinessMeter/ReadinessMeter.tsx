import type { ComponentChildren, JSX } from 'preact'
import { ProgressBar, clampPercent, type ProgressBarTone } from '../ProgressBar/ProgressBar'
import './ReadinessMeter.css'

export type ReadinessMeterTone = ProgressBarTone

/** The Score each Figma variant shows. */
const DEFAULT_VALUE: Record<ReadinessMeterTone, number> = { success: 92, warning: 74, danger: 58 }

/** The Caption each Figma variant shows. */
const DEFAULT_CAPTION: Record<ReadinessMeterTone, string> = {
  success: 'Ready to generate · 2 warnings won’t block the push',
  warning: 'Generate allowed · fix warnings before pushing',
  danger: 'Push locked · 3 checks are failing',
}

export interface ReadinessMeterProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label' | 'value'> {
  /** Figma "Tone": Success / Warning / Danger — passed to the nested Progress Bar. */
  tone?: ReadinessMeterTone
  /** Readiness 0–100 (clamped). Drives the bar and the default Score. Defaults to the variant's Score (92 / 74 / 58). */
  value?: number
  /** The "Label" layer. */
  label?: ComponentChildren
  /** The "Score" layer; defaults to `${value}%`. */
  score?: ComponentChildren
  /** The "Caption" layer; defaults to the variant's Figma caption. */
  caption?: ComponentChildren
}

/** Figma "Readiness Meter" (40000275:8183): label + score, a Progress Bar, and a caption saying what the score allows. */
export function ReadinessMeter({
  tone = 'success', value, label = 'Readiness score', score, caption, class: cls, ...rest
}: ReadinessMeterProps) {
  const pct = clampPercent(value ?? DEFAULT_VALUE[tone])
  return (
    <div {...rest} class={`bb-readiness-meter ${cls ?? ''}`} data-tone={tone}>
      <div class="bb-readiness-meter__header">
        <span class="bb-readiness-meter__label">{label}</span>
        <span class="bb-readiness-meter__score">{score ?? `${Math.round(pct)}%`}</span>
      </div>
      <ProgressBar
        class="bb-readiness-meter__bar"
        tone={tone}
        value={pct}
        aria-label={typeof label === 'string' ? label : undefined}
      />
      <p class="bb-readiness-meter__caption">{caption ?? DEFAULT_CAPTION[tone]}</p>
    </div>
  )
}
