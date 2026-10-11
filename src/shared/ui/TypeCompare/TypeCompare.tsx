import type { ComponentChildren, JSX } from 'preact'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import './TypeCompare.css'

/** One side of the comparison. Sizes are the scanned text's own numbers, in px. */
export interface TypeCompareSpec {
  size: number
  lineHeight: number
  /** Overrides the generated "13px / 16px · 1.23" line. */
  spec?: ComponentChildren
}

export interface TypeCompareProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'size'> {
  /** Figma "Current spec" — the text as scanned. */
  current: TypeCompareSpec
  /** Figma "Suggested spec" — the style the fix moves to. */
  suggested: TypeCompareSpec
  /** Figma "Sample" — rendered once per side. */
  sample?: ComponentChildren
  currentLabel?: ComponentChildren
  suggestedLabel?: ComponentChildren
}

const ratio = (s: TypeCompareSpec) => Math.round((s.lineHeight / s.size) * 100) / 100
const specLine = (s: TypeCompareSpec) => s.spec ?? `${s.size}px / ${s.lineHeight}px · ${ratio(s)}`

function Side({ tone, label, spec, sample }: { tone: 'danger' | 'success'; label: ComponentChildren; spec: TypeCompareSpec; sample: ComponentChildren }) {
  return (
    <div class="bb-type-compare__side" data-tone={tone}>
      <div class="bb-type-compare__header">
        <MetaBadge tone={tone}>{label}</MetaBadge>
        <span class="bb-type-compare__spec">{specLine(spec)}</span>
      </div>
      {/* The sample is data, not chrome: it renders at the scanned/suggested metrics. */}
      <p class="bb-type-compare__sample" style={{ fontSize: `${spec.size}px`, lineHeight: `${spec.lineHeight}px` }}>{sample}</p>
    </div>
  )
}

/** Figma "Type Compare" (40000463:9116): the WCAG card's typography preview — the scanned
 *  text at its real size and line height next to the suggested style. */
export function TypeCompare({
  current, suggested, sample = 'Text spacing lets people read comfortably when they turn up line height.',
  currentLabel = 'Current', suggestedLabel = 'Suggested', class: cls, ...rest
}: TypeCompareProps) {
  return (
    <div {...rest} class={`bb-type-compare ${cls ?? ''}`}>
      <Side tone="danger" label={currentLabel} spec={current} sample={sample} />
      <Side tone="success" label={suggestedLabel} spec={suggested} sample={sample} />
    </div>
  )
}
