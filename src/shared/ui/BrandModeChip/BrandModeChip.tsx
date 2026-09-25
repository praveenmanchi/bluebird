import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './BrandModeChip.css'

export interface BrandModeChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Brand" — the brand mode's label, e.g. "Bridge". */
  brand: ComponentChildren
  /** Figma "State": Pass / Fail. */
  pass?: boolean
  /** Figma "Current": marks the mode the plugin is themed with. */
  current?: boolean
  /** Figma "Ratio" (+ "Show ratio"). */
  ratio?: ComponentChildren
}

/** Figma "Brand Mode Chip" (40000158:7224): one brand mode's verdict for a colour pair. */
export function BrandModeChip({ brand, pass = false, current = false, ratio, class: cls, ...rest }: BrandModeChipProps) {
  return (
    <span
      {...rest}
      class={`bb-brand-mode-chip ${cls ?? ''}`}
      data-pass={pass || undefined}
      data-current={current || undefined}
    >
      <Icon name={pass ? 'status-good' : 'status-error'} class="bb-brand-mode-chip__icon" />
      <span class="bb-brand-mode-chip__brand">{brand}</span>
      {ratio !== undefined && <span class="bb-brand-mode-chip__ratio">{ratio}</span>}
    </span>
  )
}
