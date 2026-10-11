import type { ComponentChildren, JSX } from 'preact'
import './DividerLabel.css'

export interface DividerLabelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Label". */
  children?: ComponentChildren
}

/** Figma "Divider Label" (40000321:8424): a hairline divider with a centred caption. */
export function DividerLabel({ children = 'Other ways to sign in', class: cls, ...rest }: DividerLabelProps) {
  return (
    <div {...rest} class={`bb-divider-label ${cls ?? ''}`} role="separator">
      <span class="bb-divider-label__line" aria-hidden="true" />
      <span class="bb-divider-label__label">{children}</span>
      <span class="bb-divider-label__line" aria-hidden="true" />
    </div>
  )
}
