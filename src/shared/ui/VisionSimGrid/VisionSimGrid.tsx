import type { ComponentChildren, JSX } from 'preact'
import { VISION_SIMULATIONS, type VisionSimulation } from '../../figma/vision'
import { VisionSimTile, type VisionSimColors } from '../VisionSimTile/VisionSimTile'
import './VisionSimGrid.css'

export interface VisionSimGridProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The hue-only pair under test. */
  colors: VisionSimColors
  labels?: readonly [ComponentChildren, ComponentChildren]
  /** Which simulations to show, in order. All six by default. */
  simulations?: readonly VisionSimulation[]
}

/** Figma "Vision Sim Grid" (40000463:9249): the WCAG card's Mode=Vision preview — one
 *  VisionSimTile per simulation, three to a row. */
export function VisionSimGrid({ colors, labels, simulations = VISION_SIMULATIONS, class: cls, ...rest }: VisionSimGridProps) {
  return (
    <div {...rest} class={`bb-vision-sim-grid ${cls ?? ''}`}>
      {simulations.map((s) => <VisionSimTile key={s} simulation={s} colors={colors} labels={labels} />)}
    </div>
  )
}
