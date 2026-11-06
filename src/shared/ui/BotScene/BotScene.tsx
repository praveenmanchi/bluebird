import type { JSX } from 'preact'
import { EMBLEM, EYES_SHUT, type BotAgent } from '../BotAvatar/geometry'
import { Robot, RobotEyes } from '../BotAvatar/Robot'
import '../BotAvatar/BotAvatar.css'
import { EMBLEM as UXAI_EMBLEM } from '../UxaiBot/geometry'
import { FACE_LINES, FACE_WIDE, FACE_LINE_WIDTH, LOOK, ROBOT_SCALE } from './geometry'
import { SCENES, type BotSceneId, type SceneFace } from './scenes'
import './BotScene.css'

export type { BotSceneId } from './scenes'
export const BOT_SCENES = Object.keys(SCENES) as readonly BotSceneId[]

/** Figma "Character": UX AI, or the agent that hit the problem. */
export type BotSceneCharacter = 'uxai' | BotAgent

export interface BotSceneProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'character'> {
  /** Figma "Scene". */
  scene: BotSceneId
  character?: BotSceneCharacter
}

/** Figma "Bot Scene" (40002629:7211): a funny illustration for a UX AI or agent failure or empty
 *  state. Always decorative: the title and body beside it say what happened. */
export function BotScene({ scene, character = 'uxai', class: cls, ...rest }: BotSceneProps) {
  const s = SCENES[scene]
  return (
    <svg
      {...rest}
      class={`bb-bot-avatar bb-bot-scene ${cls ?? ''}`}
      data-scene={scene}
      data-character={character}
      data-agent={character === 'uxai' ? undefined : character}
      viewBox="0 0 280 160"
      fill="none"
      aria-hidden="true"
    >
      <g dangerouslySetInnerHTML={{ __html: s.behind }} />
      <g transform={`translate(${s.x} ${s.y}) scale(${ROBOT_SCALE})`}>
        <Robot
          pose={s.active ? 'active' : 'idle'}
          face={<Face face={s.face} />}
          emblem={character === 'uxai' ? UXAI_EMBLEM : EMBLEM[character]}
          arms={s.arms}
          lift={s.lift}
        />
      </g>
      <g dangerouslySetInnerHTML={{ __html: s.front }} />
    </svg>
  )
}

function Face({ face }: { face: SceneFace }) {
  const shift = LOOK[face]
  if (shift) return <g transform={`translate(${shift.x} ${shift.y})`}><RobotEyes /></g>
  if (face === 'wide') return <>{FACE_WIDE.map((eye) => <circle key={eye.cx} class="bb-bot-avatar__eye" {...eye} />)}</>
  if (face === 'sleep') return <>{EYES_SHUT.map((eye) => <rect key={eye.x} class="bb-bot-avatar__eye" {...eye} />)}</>
  if (face === 'worry') return <><g transform="translate(0 1)"><RobotEyes /></g><path class="bb-bot-scene__face" d={FACE_LINES.worry} stroke-width={FACE_LINE_WIDTH} /></>
  if (face === 'eyes') return <RobotEyes />
  return <path class="bb-bot-scene__face" d={FACE_LINES[face as keyof typeof FACE_LINES]} stroke-width={FACE_LINE_WIDTH} />
}
