import type { JSX } from 'preact'
import './ValueDiff.css'

export type ValueDiffKind = 'color' | 'number'

export interface ValueDiffProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'old'> {
  /** Figma "Kind": Color (a swatch before each value) / Number (values only). */
  kind?: ValueDiffKind
  /** Figma "Old" — the value before the change. */
  old?: string
  /** Figma "New" — the value after the change. */
  new?: string
  /** Swatch colour for the old side when the label is not itself a CSS colour (defaults to `old`). */
  oldColor?: string
  /** Swatch colour for the new side when the label is not itself a CSS colour (defaults to `new`). */
  newColor?: string
}

/** Scanned data, not design: the swatch paints the variable's own value through a local custom property. */
function Swatch({ color }: { color: string }) {
  const style = { '--value-diff-swatch': color } as JSX.CSSProperties
  return <span class="bb-value-diff__swatch" style={style} aria-hidden="true" />
}

/** Figma "Value Diff" (40000341:8469): old value (struck through) → new value, with swatches for colours. */
export function ValueDiff({
  kind = 'color',
  old = '#0C8CE9', // allow-raw: sample content mirroring the Figma component, shown as data
  new: next = '#0560A3', // allow-raw: sample content mirroring the Figma component, shown as data
  oldColor,
  newColor,
  class: cls,
  ...rest
}: ValueDiffProps) {
  const color = kind === 'color'
  return (
    <span {...rest} class={`bb-value-diff ${cls ?? ''}`} data-kind={kind}>
      <span class="bb-value-diff__side">
        {color && <Swatch color={oldColor ?? old} />}
        <del class="bb-value-diff__old">{old}</del>
      </span>
      <span class="bb-value-diff__arrow" aria-hidden="true">→</span>
      <span class="bb-value-diff__side">
        {color && <Swatch color={newColor ?? next} />}
        <ins class="bb-value-diff__new">{next}</ins>
      </span>
    </span>
  )
}
