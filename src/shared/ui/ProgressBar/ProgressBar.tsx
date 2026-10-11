import type { JSX } from 'preact'
import './ProgressBar.css'

export type ProgressBarTone = 'success' | 'warning' | 'danger'

/** 0–100, rounded to one decimal; anything that is not a finite number reads as 0. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}

export interface ProgressBarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'value'> {
  /** Figma "Value" (92 / 70 / 58 / 25 / 50 / 64 / 75 / 100 in the set). Any 0–100 number; clamped. */
  value?: number
  /** Figma "Tone": Success / Warning / Danger — the fill colour (mcp/meter/*). */
  tone?: ProgressBarTone
}

/** Figma "Progress Bar" (40000275:8128): a pill track with a tone-coloured fill sized to `value`. */
export function ProgressBar({ value = 92, tone = 'success', class: cls, ...rest }: ProgressBarProps) {
  const pct = clampPercent(value)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      {...rest}
      class={`bb-progress-bar ${cls ?? ''}`}
      data-tone={tone}
    >
      <div class="bb-progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
