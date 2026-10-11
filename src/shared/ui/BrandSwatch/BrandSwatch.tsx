import type { ComponentChildren, JSX } from 'preact'
import { BRAND_LABELS, type BrandId } from '../../brand/generated/tokens'
import { ColorSwatch } from '../ColorSwatch/ColorSwatch'
import './BrandSwatch.css'

export interface BrandSwatchProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label'> {
  /** Brand mode the swatch resolves in (Figma sets an explicit Brand UI mode on the Swatch instance). Omit to inherit the surrounding brand. */
  brand?: BrandId
  /** Figma "Brand" — the caption. Defaults to the brand's label. */
  label?: ComponentChildren
  /** Figma "Hex" — the resolved value, as text. */
  hex?: string
  /** Swatch colour: a CSS colour or `var(--bb-…)`, which resolves in `brand`. Omit for the Color Swatch default fill. */
  color?: string
}

/** Figma "Brand Swatch" (40000285:8153): one brand's value of a colour variable — Large swatch, brand name, hex. */
export function BrandSwatch({ brand, label, hex = '#0A84FF', color, class: cls, ...rest }: BrandSwatchProps) {
  return (
    <div {...rest} class={`bb-brand-swatch ${cls ?? ''}`}>
      <ColorSwatch size="large" color={color} data-brand={brand} class="bb-brand-swatch__swatch" />
      <span class="bb-brand-swatch__brand">{label ?? (brand ? BRAND_LABELS[brand] : 'Bridge')}</span>
      <span class="bb-brand-swatch__hex">{hex}</span>
    </div>
  )
}
