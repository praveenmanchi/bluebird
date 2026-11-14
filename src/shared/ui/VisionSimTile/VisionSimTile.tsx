import type { ComponentChildren, JSX } from 'preact'
import { hexToRgb, rgbaToHex } from '../../figma/color'
import { LOW_VISION_BLUR_PX, simulateVision, staysDistinct, type VisionSimulation } from '../../figma/vision'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import './VisionSimTile.css'

/** The two colours that carry meaning by hue alone, and the surface they sit on (hex). */
export interface VisionSimColors {
  a: string
  b: string
  bg?: string
}

export interface VisionSimTileProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Simulation". */
  simulation: VisionSimulation
  colors: VisionSimColors
  /** Text on the two pills. */
  labels?: readonly [ComponentChildren, ComponentChildren]
  name?: ComponentChildren
  caption?: ComponentChildren
}

export const VISION_NAME: Record<VisionSimulation, string> = {
  normal: 'Normal', protanopia: 'Protanopia', deuteranopia: 'Deuteranopia',
  tritanopia: 'Tritanopia', achromatopsia: 'Achromatopsia', 'low-vision': 'Low vision',
}
const CAPTION: Record<VisionSimulation, string> = {
  normal: 'Typical colour vision', protanopia: 'Red-blind · ~1% of men', deuteranopia: 'Green-blind · ~1% of men',
  tritanopia: 'Blue-blind · rare', achromatopsia: 'No colour · rare', 'low-vision': 'Blur · reduced acuity',
}

/** Figma "Vision Sim Tile" (40000463:9248): one colour-vision simulation of a hue-only pair,
 *  with a verdict on whether the two still read as different. */
export function VisionSimTile({
  simulation, colors, labels = ['Error', 'Success'], name, caption, class: cls, ...rest
}: VisionSimTileProps) {
  const a = hexToRgb(colors.a), b = hexToRgb(colors.b), bg = hexToRgb(colors.bg ?? '#FFFFFF') // allow-raw: white page behind a pair that names no background
  if (!a || !b || !bg) return null
  const show = (c: typeof a) => rgbaToHex(simulateVision(c, simulation))
  const distinct = staysDistinct(a, b, simulation)
  const verdict = distinct ? 'Distinct' : simulation === 'low-vision' ? 'Blurred' : 'Look alike'
  return (
    <div {...rest} class={`bb-vision-sim-tile ${cls ?? ''}`} data-simulation={simulation} data-distinct={distinct || undefined}>
      <div class="bb-vision-sim-tile__sample" style={{ background: show(bg), filter: simulation === 'low-vision' ? `blur(${LOW_VISION_BLUR_PX}px)` : undefined }} aria-hidden="true">
        <span class="bb-vision-sim-tile__pill" style={{ background: show(a) }}>{labels[0]}</span>
        <span class="bb-vision-sim-tile__pill" style={{ background: show(b) }}>{labels[1]}</span>
      </div>
      <span class="bb-vision-sim-tile__name">{name ?? VISION_NAME[simulation]}</span>
      <span class="bb-vision-sim-tile__caption">{caption ?? CAPTION[simulation]}</span>
      <MetaBadge tone={distinct ? 'success' : 'danger'} class="bb-vision-sim-tile__verdict">{verdict}</MetaBadge>
    </div>
  )
}
