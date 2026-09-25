import type { ComponentChildren, JSX } from 'preact'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import './FixRow.css'

export interface FixRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label'> {
  /** Figma "Label" — the sentence above the meta row. */
  label?: ComponentChildren
  /** Figma "Hex" — the value the fix produces. */
  hex?: string
  /** Colour the sample sits on, so the swatch shows the real pairing. */
  on?: string
  /** Figma "Ratio" — what the fix achieves. */
  ratio?: ComponentChildren
  /** Copy inside the sample chip. */
  sample?: ComponentChildren
  applyLabel?: ComponentChildren
  /** Omit to render the suggestion read-only. */
  onApply?: () => void
}

/** Figma "Fix Row" (40000164:7288): the remediation, stated as a token, with the action that binds it. */
export function FixRow({
  label = 'Suggested value', hex, on, ratio, sample = 'Aa',
  applyLabel = 'Apply', onApply, class: cls, ...rest
}: FixRowProps) {
  return (
    <div {...rest} class={`bb-fix-row ${cls ?? ''}`}>
      <span class="bb-fix-row__icon"><Icon name="tool-fix" /></span>
      <div class="bb-fix-row__body">
        <p class="bb-fix-row__label">{label}</p>
        <div class="bb-fix-row__meta">
          {hex !== undefined && on !== undefined && (
            <span class="bb-fix-row__sample" style={{ background: on, color: hex }}>{sample}</span>
          )}
          {hex !== undefined && <span class="bb-fix-row__hex">{hex.toUpperCase()}</span>}
          {ratio !== undefined && <span class="bb-fix-row__ratio">{ratio}</span>}
        </div>
      </div>
      {onApply && <Button onClick={onApply} class="bb-fix-row__apply">{applyLabel}</Button>}
    </div>
  )
}
