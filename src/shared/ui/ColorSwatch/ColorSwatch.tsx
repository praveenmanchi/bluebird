import type { JSX } from 'preact'
import './ColorSwatch.css'

export type ColorSwatchSize = 'small' | 'large'

export interface ColorSwatchProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'size'> {
  /** Figma "Size": Small (uxai/size/swatch) / Large (uxai/size/swatch-lg). */
  size?: ColorSwatchSize
  /** The colour on show — any CSS colour, or `var(--bb-…)` to show a token. Omit for the Figma default fill (uxai/beam/5). */
  color?: string
  /** Accessible name; omit when a sibling already names the colour (the swatch is then decorative). */
  label?: string
}

/** Figma "Color Swatch" (40000283:8194): a square chip filled with one colour. */
export function ColorSwatch({ size = 'small', color, label, class: cls, style, ...rest }: ColorSwatchProps) {
  return (
    <span
      {...rest}
      class={`bb-color-swatch ${cls ?? ''}`}
      data-size={size}
      style={withFill(style, color)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    />
  )
}

/** Layers the swatch colour over any caller style without mutating it. */
function withFill(style: ColorSwatchProps['style'], color: string | undefined): ColorSwatchProps['style'] {
  if (color === undefined) return style
  if (typeof style === 'string') return `${style};background:${color}`
  if (style && typeof style === 'object' && !('value' in style)) return { ...style, background: color }
  return { background: color }
}
