// Vector geometry of Figma "Bot Avatar" (40000295:8478), a hover robot in a 40 × 40 frame, origin
// top-left. Every agent shares the same body; only the chest emblem and the colour change. Colour
// never lives here: every layer is painted by BotAvatar.css with tokens. Stroke widths and layer
// opacities are layer properties of the vector, so they travel with the shapes.
import type { IconName } from '../Icon/Icon'

export type BotAgent = 'accessibility' | 'content' | 'writing' | 'spelling' | 'design-system' | 'localization'
export type BotState = 'default' | 'working' | 'sleeping'

export const BOT_AGENTS: readonly BotAgent[] = ['accessibility', 'content', 'writing', 'spelling', 'design-system', 'localization']
export const BOT_STATES: readonly BotState[] = ['default', 'working', 'sleeping']

export const FRAME_CENTRE = 20

/** The chest "Icon" layer: a library icon, sized and centred on the shield as Figma places it. */
export const EMBLEM: Record<BotAgent, { icon: IconName; size: number; cy: number }> = {
  accessibility: { icon: 'accessibility', size: 15, cy: 25.2 },
  content: { icon: 'text', size: 21, cy: 24.7 },
  writing: { icon: 'ui-ai-feature-rewrite', size: 19, cy: 24.7 },
  spelling: { icon: 'ui-text-underline-wave', size: 21, cy: 24.7 },
  'design-system': { icon: 'ui-layer-component', size: 15, cy: 24.7 },
  localization: { icon: 'ui-misc-language', size: 20, cy: 24.7 },
}

export const HOVER = { cx: 20, cy: 38.33, rx: 8.67, ry: 1.2, restRx: 6 } as const
export const THRUSTER = { x: 15.33, y: 35.33, width: 9.33, height: 2, rx: 1 } as const
export const ARMS = [
  { x: 1.33, y: 19.33, width: 3.67, height: 11.33, rx: 1.83, raised: 'rotate(28 4 20)' },
  { x: 35, y: 19.33, width: 3.67, height: 11.33, rx: 1.83, raised: 'rotate(-28 36 20)' },
] as const
export const EARS = [
  { x: 5.67, y: 5.33, width: 3, height: 7.33, rx: 1.5 },
  { x: 31.33, y: 5.33, width: 3, height: 7.33, rx: 1.5 },
] as const
export const NECK = { x: 16.67, y: 14.67, width: 6.67, height: 3.33 } as const
export const HEAD = { x: 7.67, y: 1.33, width: 24.67, height: 14.67, rx: 6.67 } as const
export const VISOR = { x: 10.33, y: 4, width: 19.33, height: 9.33, rx: 4.67, strokeWidth: 0.83 } as const
export const TORSO = { x: 5.33, y: 16.67, width: 29.33, height: 19.33, rx: 8 } as const
export const SHIELD = 'M12.67 17.67H27.33a2.67 2.67 0 0 1 2.2 1.17l2.67 4a2.67 2.67 0 0 1-.23 3.2L22 34.67a2.67 2.67 0 0 1-4 0L8.03 26.03a2.67 2.67 0 0 1-.23-3.2l2.67-4A2.67 2.67 0 0 1 12.67 17.67Z'

/** Default: two upright eyes. */
export const EYES = [
  { x: 15, y: 6.17, width: 3, height: 5, rx: 1.5 },
  { x: 22, y: 6.17, width: 3, height: 5, rx: 1.5 },
] as const
/** Sleeping: the eyes close to two dashes. */
export const EYES_SHUT = [
  { x: 14.33, y: 8.17, width: 4.33, height: 1.2, rx: 0.6 },
  { x: 21.33, y: 8.17, width: 4.33, height: 1.2, rx: 0.6 },
] as const
/** Working: one scan line across the visor. */
export const SCAN = { x: 13.67, y: 7.67, width: 12.67, height: 2, rx: 1 } as const
/** Working: thruster flames under the body. */
export const THRUST = 'M16.67 37.67v1.67M20 37.67v2M23.33 37.67v1.67'
/** Working: targeting brackets in the frame corners. */
export const BRACKETS = 'M1 5V1H5M35 1H39V5M39 35V39H35M5 39H1V35'
export const LINE_WIDTH = 1
/** Sleeping: a single Z. */
export const ZZZ = 'M33.33 2h4L33.33 6.67h4'

export const OPACITY = { limb: 0.85, neck: 0.7, hover: 0.35, hoverRest: 0.2, emblemRest: 0.72 } as const
