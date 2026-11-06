// The props around the robot in each Figma "Bot Scene" (280 × 160), as SVG markup. Colour never
// lives here: `c` names a BotScene.css class. Everything is drawn behind or in front of the robot.
import type { RobotArm } from '../BotAvatar/Robot'

export type BotSceneId =
  | 'no-connection' | 'default-needed' | 'wire-cut' | 'connection-lost' | 'wrong-key' | 'too-many-requests' | 'timed-out'
  | 'something-broke' | 'empty-shelf' | 'unreadable' | 'no-answer' | 'nothing-selected' | 'all-clear' | 'fix-stuck'

export type SceneFace = 'eyes' | 'look-right' | 'look-down' | 'wide' | 'down' | 'happy' | 'sleep' | 'crossed' | 'worry'

export interface SceneDefinition {
  /** Top left of the robot's 120-unit box. */
  x: number
  y: number
  face: SceneFace
  arms?: { left?: RobotArm; right?: RobotArm }
  /** Head lifted on a spring, in the robot's 40-unit frame. */
  lift?: number
  active?: boolean
  behind: string
  front: string
}

type Colour = 'body' | 'white' | 'pupil' | 'danger' | 'amber' | 'muted'

const line = (d: string, c: Colour, w: number, extra = '') => `<path class="bb-bot-scene__line-${c}" d="${d}" stroke-width="${w}" ${extra}/>`
const dashed = 'stroke-dasharray="6 7"'
const shape = (el: string, c: Colour, attrs: string) => `<${el} class="bb-bot-scene__fill-${c}" ${attrs}/>`
const outline = (el: string, c: Colour, w: number, attrs: string) => `<${el} class="bb-bot-scene__line-${c}" stroke-width="${w}" ${attrs}/>`

const floor = line('M8 152H272', 'muted', 2, 'opacity=".45"')
const question = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${line('M0 8c0-11 19-11 19 0 0 8-9.5 8-9.5 16', 'amber', 4.6)}${shape('circle', 'amber', 'cx="9.5" cy="32" r="3"')}</g>`
const socket = (x: number, y: number) => outline('rect', 'muted', 3, `x="${x}" y="${y}" width="26" height="40" rx="6"`) + line(`M${x + 6} ${y + 15}h8M${x + 6} ${y + 25}h8`, 'muted', 3)
const plug = (x: number, y: number) => shape('rect', 'amber', `x="${x}" y="${y}" width="20" height="17" rx="5"`) + line(`M${x + 20} ${y + 5}h8M${x + 20} ${y + 12}h8`, 'amber', 3)
const drop = (x: number, y: number) => shape('path', 'pupil', `d="M${x} ${y}c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12Z"`)

const requests = ([[172, 120, 0], [182, 92, -4], [170, 64, 5], [186, 36, -7]] as const).map(([x, y, a]) =>
  `<g transform="rotate(${a} ${x + 40} ${y + 13})">${shape('rect', 'white', `x="${x}" y="${y}" width="80" height="27" rx="10"`)}${outline('rect', 'muted', 3, `x="${x}" y="${y}" width="80" height="27" rx="10"`)}${[26, 40, 54].map((d) => shape('circle', 'muted', `cx="${x + d}" cy="${y + 13.5}" r="3"`)).join('')}</g>`).join('')

const confetti = ([[30, 30, 'amber', 20], [56, 70, 'pupil', -30], [24, 104, 'body', 40], [226, 28, 'body', -20], [250, 72, 'amber', 30], [214, 100, 'pupil', 15], [66, 20, 'danger', 10], [240, 118, 'danger', -25]] as const).map(([x, y, c, a]) =>
  shape('rect', c, `x="${x}" y="${y}" width="12" height="7" rx="1.5" transform="rotate(${a} ${x} ${y})"`)).join('')

export const SCENES: Record<BotSceneId, SceneDefinition> = {
  'no-connection': {
    x: 24, y: 30, face: 'look-down',
    behind: floor + line('M132 118C152 156 176 152 196 145', 'muted', 4),
    front: plug(196, 136) + socket(246, 108) + line('M226 142C234 140 238 136 244 130', 'muted', 2.5, dashed) + question(150, 20, 0.9),
  },
  'default-needed': {
    x: 16, y: 30, face: 'worry', arms: { right: 'out' },
    behind: floor,
    front: plug(154, 94) + outline('rect', 'muted', 3, 'x="212" y="20" width="56" height="124" rx="12"')
      + [48, 82, 116].map((y) => outline('circle', 'muted', 3, `cx="240" cy="${y}" r="12"`) + line(`M235 ${y}h10`, 'muted', 3)).join('')
      + line('M184 98L226 52M184 102H226M184 106L226 112', 'muted', 2.5, dashed) + question(150, 14, 0.9) + question(176, 30, 0.6),
  },
  'wire-cut': {
    x: 150, y: 30, face: 'wide', arms: { left: 'out' },
    behind: floor + socket(4, 104) + line('M30 124C56 152 80 150 100 128', 'muted', 4) + line('M100 128l8-6M100 128l10-1M100 128l8 5', 'muted', 2.5),
    front: line('M130 104l-6 8', 'muted', 4) + line('M124 112l-8-2M124 112l-6 6M124 112l1 8', 'muted', 2.5) + shape('path', 'amber', 'd="M117 84l-11 20h9l-7 18 19-24h-10l8-14Z"'),
  },
  'connection-lost': {
    x: 16, y: 30, face: 'down',
    behind: floor + line('M126 118C146 150 164 150 186 144', 'muted', 4),
    front: plug(186, 135) + line('M214 134l10-4M214 144h11', 'muted', 2.5)
      + shape('path', 'white', 'd="M158 10H246a18 18 0 0 1 18 18V62a18 18 0 0 1-18 18H172L146 100V76a18 18 0 0 1-6-14V28A18 18 0 0 1 158 10Z"')
      + outline('path', 'body', 4, 'd="M158 10H246a18 18 0 0 1 18 18V62a18 18 0 0 1-18 18H172L146 100V76a18 18 0 0 1-6-14V28A18 18 0 0 1 158 10Z"')
      + line('M180 40a34 34 0 0 1 44 0', 'body', 4.5) + line('M190 51a19 19 0 0 1 24 0', 'body', 4.5) + shape('circle', 'body', 'cx="202" cy="62" r="4"') + line('M180 22L224 68', 'danger', 5),
  },
  'wrong-key': {
    x: 10, y: 30, face: 'worry', arms: { right: 'out' },
    behind: floor,
    front: outline('circle', 'amber', 6, 'cx="166" cy="102" r="11"') + line('M177 102h24l10-10', 'amber', 6) + line('M232 84V70a14 14 0 0 1 28 0v14', 'muted', 6)
      + shape('rect', 'muted', 'x="220" y="84" width="52" height="46" rx="9"') + shape('circle', 'white', 'cx="246" cy="102" r="6"') + line('M246 106v10', 'white', 4),
  },
  'too-many-requests': {
    x: 10, y: 30, face: 'down',
    behind: floor,
    front: drop(136, 28) + drop(150, 50) + requests,
  },
  'timed-out': {
    x: 44, y: 30, face: 'sleep',
    behind: floor,
    front: line('M170 22h14L170 38h14', 'muted', 4) + line('M192 8h10L192 20h10', 'muted', 3.4)
      + line('M0 0L52 8M0 0L40 36M0 0L10 54M18 3c5 5 7 10 6 18c-8 1-14-1-19-6M34 5c6 9 9 17 6 30c-14 2-24-1-33-11', 'muted', 1.6)
      + line('M206 36h48M206 144h48', 'muted', 6) + outline('path', 'muted', 3, 'd="M214 40h32c0 26-12 30-16 40 4 10 16 14 16 40v20h-32v-20c0-26 12-30 16-40-4-10-16-14-16-40Z"')
      + shape('path', 'amber', 'd="M217 140c1-16 25-16 26 0Z"'),
  },
  'something-broke': {
    x: 78, y: 40, face: 'crossed', lift: 4,
    behind: floor,
    front: ([[104, 12, 9], [126, 8, 12], [150, 14, 8]] as const).map(([x, y, r]) => shape('circle', 'muted', `cx="${x}" cy="${y}" r="${r}" opacity=".5"`)).join('')
      + shape('path', 'amber', 'd="M226 64l5 14 14 2-11 9 3 14-11-7-12 7 3-14-11-9 14-2Z"') + shape('path', 'muted', 'd="M42 134l10-6 10 6v11l-10 6-10-6Z"') + shape('circle', 'white', 'cx="52" cy="140" r="3.5"'),
  },
  'empty-shelf': {
    x: 16, y: 30, face: 'look-right',
    behind: floor,
    front: line('M164 44H272M164 98H272M164 150H272', 'muted', 5) + line('M172 44V150M264 44V150', 'muted', 4)
      + shape('rect', 'amber', 'x="240" y="120" width="11" height="28" rx="2" transform="rotate(18 245 134)"') + line('M172 44c7 3 10 8 11 16M172 60c5-1 9-1 11 0', 'muted', 1.5) + question(148, 14, 0.9),
  },
  unreadable: {
    x: 10, y: 30, face: 'worry', arms: { right: 'out' },
    behind: floor,
    front: shape('path', 'white', 'd="M162 70q24-14 46 0v64q-22-14-46 0Z"') + outline('path', 'muted', 3, 'd="M162 70q24-14 46 0v64q-22-14-46 0Z"')
      + shape('path', 'white', 'd="M208 70q22-14 46 0v64q-24-14-46 0Z"') + outline('path', 'muted', 3, 'd="M208 70q22-14 46 0v64q-24-14-46 0Z"')
      + line('M172 84q4-5 8 0t8 0t8 0M172 98q4-5 8 0t8 0t8 0M172 112q4-5 8 0t8 0', 'muted', 2.6) + line('M218 84q4-5 8 0t8 0t8 0M218 98q4-5 8 0t8 0t8 0M218 112q4-5 8 0t8 0', 'muted', 2.6) + question(214, 20, 0.8),
  },
  'no-answer': {
    x: 6, y: 30, face: 'look-right', arms: { right: 'out' },
    behind: floor,
    front: line('M150 104L160 95', 'body', 7) + shape('circle', 'white', 'cx="174" cy="82" r="19"') + outline('circle', 'body', 6, 'cx="174" cy="82" r="19"')
      + line('M196 118h14M190 132h14M198 146h10', 'muted', 3) + outline('circle', 'muted', 3, 'cx="240" cy="132" r="19"')
      + line('M224 122c10 8 24 10 34 2M222 136c12-6 26-4 36 6M232 114c-4 12-2 28 6 37M250 116c4 12 0 26-8 34', 'muted', 2.2),
  },
  'nothing-selected': {
    x: 10, y: 30, face: 'look-right', arms: { right: 'out' },
    behind: floor,
    front: outline('rect', 'body', 3, 'x="170" y="36" width="92" height="92" stroke-dasharray="7 6"')
      + ([[170, 36], [262, 36], [170, 128], [262, 128]] as const).map(([x, y]) => shape('rect', 'white', `x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2"`) + outline('rect', 'body', 3, `x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2"`)).join('') + question(206, 62),
  },
  'all-clear': {
    x: 80, y: 30, face: 'happy', arms: { left: 'up', right: 'up' }, active: true,
    behind: floor,
    front: confetti + shape('path', 'amber', 'd="M196 28q2 12 14 14q-12 2-14 14q-2-12-14-14q12-2 14-14Z"') + shape('path', 'amber', 'd="M84 8q1.5 8 10 10q-8.5 2-10 10q-1.5-8-10-10q8.5-2 10-10Z"'),
  },
  'fix-stuck': {
    x: 10, y: 30, face: 'worry', arms: { right: 'out' },
    behind: floor,
    front: drop(136, 26) + line('M152 102H202', 'muted', 9) + shape('path', 'muted', 'd="M196 88l14-2 6 12-6 12-14-2 6-10Z"') + shape('path', 'muted', 'd="M232 66l28 16v32l-28 16-28-16V82Z"')
      + shape('circle', 'white', 'cx="232" cy="98" r="11"') + line('M232 40v12M262 52l-7 9M202 52l7 9', 'amber', 3.4),
  },
}
