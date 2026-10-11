import type { JSX } from 'preact'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import { ValueDiff, type ValueDiffKind } from '../ValueDiff/ValueDiff'
import './BrandDiffRow.css'

export type BrandDiffRowState = 'changed' | 'unchanged'

export interface BrandDiffRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'old'> {
  /** Figma "Brand" — the brand mode this row reports. */
  brand?: string
  /** Figma "State": Changed (Value Diff + "Changed" badge) / Unchanged (value text + "Same" badge). */
  state?: BrandDiffRowState
  /** The nested Value Diff's Kind (State=Changed). */
  kind?: ValueDiffKind
  /** The nested Value Diff's Old (State=Changed). */
  old?: string
  /** The nested Value Diff's New (State=Changed). */
  new?: string
  /** Swatch colour overrides passed to the nested Value Diff. */
  oldColor?: string
  newColor?: string
  /** The brand's current value (State=Unchanged), rendered as "<value> · unchanged". */
  value?: string
}

/** Figma "Brand Diff Row" (40000345:8584): one brand's value for a changed variable. */
export function BrandDiffRow({
  brand = 'Bridge',
  state = 'changed',
  kind = 'color',
  old = '#0C8CE9',
  new: next = '#0560A3',
  oldColor,
  newColor,
  value = '#0C8CE9',
  class: cls,
  ...rest
}: BrandDiffRowProps) {
  const changed = state === 'changed'
  return (
    <div {...rest} class={`bb-brand-diff-row ${cls ?? ''}`} data-state={state}>
      <span class="bb-brand-diff-row__brand">{brand}</span>
      {changed
        ? <ValueDiff kind={kind} old={old} new={next} oldColor={oldColor} newColor={newColor} />
        : <span class="bb-brand-diff-row__value">{`${value} · unchanged`}</span>}
      <MetaBadge tone={changed ? 'accent' : 'neutral'} class="bb-brand-diff-row__badge">{changed ? 'Changed' : 'Same'}</MetaBadge>
    </div>
  )
}
