// Faces only Bot Scene uses, in the robot's 40-unit frame. Colour lives in BotScene.css.

/** The robot's 40-unit frame drawn on the scene's 120-unit grid. */
export const ROBOT_SCALE = 3

export const LOOK: Partial<Record<string, { x: number; y: number }>> = {
  'look-right': { x: 2.33, y: 0.33 },
  'look-down': { x: 1.33, y: 1 },
}
export const FACE_WIDE = [{ cx: 16.33, cy: 8.67, r: 2.5 }, { cx: 23.67, cy: 8.67, r: 2.5 }] as const
export const FACE_LINES = {
  down: 'M14.33 7.33q2 3 4 0M21.67 7.33q2 3 4 0',
  happy: 'M14.33 10q2-3.33 4 0M21.67 10q2-3.33 4 0',
  crossed: 'M14.67 7l3.33 3.33M18 7l-3.33 3.33M22 7l3.33 3.33M25.33 7l-3.33 3.33',
  worry: 'M14.33 6l3.67 1M25.67 6l-3.67 1',
} as const
export const FACE_LINE_WIDTH = 1.2
