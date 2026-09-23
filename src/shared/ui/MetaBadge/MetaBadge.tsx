import type { ComponentChildren, JSX } from 'preact'
import './MetaBadge.css'

export type MetaBadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export interface MetaBadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Tone": Neutral / Accent / Success / Warning / Danger. */
  tone?: MetaBadgeTone
  /** Figma "Label" — the status word. */
  children?: ComponentChildren
  /** Figma "Meta" (+ "Show meta") — an optional trailing detail. */
  meta?: ComponentChildren
}

/** Figma "Meta Badge" (40000156:7214): a small pill carrying a status word beside a title. */
export function MetaBadge({ tone = 'neutral', children = 'Label', meta, class: cls, ...rest }: MetaBadgeProps) {
  return (
    <span {...rest} class={`bb-meta-badge ${cls ?? ''}`} data-tone={tone}>
      <span class="bb-meta-badge__label">{children}</span>
      {meta !== undefined && <span class="bb-meta-badge__meta">{meta}</span>}
    </span>
  )
}
