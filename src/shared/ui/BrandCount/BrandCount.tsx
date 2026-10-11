import type { ComponentChildren, JSX } from 'preact'
import './BrandCount.css'

export type BrandCountTone = 'success' | 'warning' | 'danger' | 'empty'

/** Figma's thresholds: ≥8 findings Danger, ≥5 Warning, else Success; null is Empty. */
export function brandCountTone(n: number | null | undefined): BrandCountTone {
  if (n === null || n === undefined) return 'empty'
  return n >= 8 ? 'danger' : n >= 5 ? 'warning' : 'success'
}

export interface BrandCountProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Tone"; derived from `count` when omitted. */
  tone?: BrandCountTone
  /** Figma "Brand". */
  brand?: ComponentChildren
  /** Findings in this brand mode, or null before a scan. */
  count?: number | null
  /** Figma "Value"; defaults to `count` or "—". */
  value?: ComponentChildren
}

/** Figma "Brand Count" (40000447:8631): findings in one brand mode. */
export function BrandCount({ tone, brand = 'Bridge', count = null, value, class: cls, ...rest }: BrandCountProps) {
  return (
    <div {...rest} class={`bb-brand-count ${cls ?? ''}`} data-tone={tone ?? brandCountTone(count)}>
      <span class="bb-brand-count__brand">{brand}</span>
      <span class="bb-brand-count__value">{value ?? (count === null ? '—' : count)}</span>
    </div>
  )
}
