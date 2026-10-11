import type { ComponentChildren, JSX } from 'preact'
import { ProgressBar } from '../ProgressBar/ProgressBar'
import { scoreTone, type ScoreTone } from '../ScoreValue/ScoreValue'
import './LevelRow.css'

export interface LevelRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Tone"; derived from passing / total when omitted. */
  tone?: ScoreTone
  /** Figma "Name". */
  name?: ComponentChildren
  /** Figma "Hint". */
  hint?: ComponentChildren
  /** Passing count, or null before a scan. */
  passing?: number | null
  total?: number
}

/** Figma "Level Row" (40000447:8664): pass rate for one component level. */
export function LevelRow({ tone, name = 'Atoms', hint, passing = null, total = 0, class: cls, ...rest }: LevelRowProps) {
  const pct = passing === null || total === 0 ? null : Math.round((passing / total) * 100)
  const t = tone ?? scoreTone(pct)
  return (
    <div {...rest} class={`bb-level-row ${cls ?? ''}`} data-tone={t}>
      <span class="bb-level-row__name">
        <span class="bb-level-row__title">{name}</span>
        {hint !== undefined && <span class="bb-level-row__hint">{hint}</span>}
      </span>
      <span class="bb-level-row__count">{passing === null ? '—' : passing} / {total}</span>
      <ProgressBar class="bb-level-row__bar" tone={t === 'empty' ? 'success' : t} value={pct ?? 0} aria-label={typeof name === 'string' ? `${name} passing` : undefined} />
      <span class="bb-level-row__percent">{pct === null ? '—' : `${pct}%`}</span>
    </div>
  )
}
