import type { JSX } from 'preact'
import { Robot, RobotEyes } from '../BotAvatar/Robot'
import { SCAN } from '../BotAvatar/geometry'
import '../BotAvatar/BotAvatar.css'
import { BUBBLE, BUBBLE_DOTS, BUBBLE_LINES, BUBBLE_LINE_WIDTH, BUBBLE_STROKE, EMBLEM, ROBOT_ASIDE, SMILE, SMILE_WIDTH } from './geometry'
import './UxaiBot.css'

export type UxaiBotState = 'ready' | 'searching' | 'answering'
export type UxaiBotSize = '20' | '40'

export const UXAI_BOT_STATES: readonly UxaiBotState[] = ['ready', 'searching', 'answering']

export interface UxaiBotProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'state' | 'size'> {
  /** Figma "State": Ready (the robot alone) / Searching (dots) / Answering (lines of text). */
  state?: UxaiBotState
  /** 20 beside an answer, 40 on its own. */
  size?: UxaiBotSize
  /** Accessible name. Omit when the bot is decorative (e.g. beside an assistant message). */
  label?: string
}

/** Figma "UX AI Bot" (40002611:72953): the assistant, built on the agent robot. The bubble shows
 *  only while it is working, and the robot steps back to make room for it. */
export function UxaiBot({ state = 'ready', size = '40', label, class: cls, ...rest }: UxaiBotProps) {
  const working = state !== 'ready'
  return (
    <svg
      {...rest}
      class={`bb-bot-avatar bb-uxai-bot ${cls ?? ''}`}
      data-state={state}
      data-size={size}
      viewBox="0 0 40 40"
      fill="none"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <g class="bb-uxai-bot__robot" style={working ? { transform: ROBOT_ASIDE } : undefined}>
        <Robot pose={state === 'searching' ? 'active' : 'idle'} face={<Face state={state} />} emblem={EMBLEM} />
      </g>
      {working && <Bubble state={state} />}
    </svg>
  )
}

function Face({ state }: { state: UxaiBotState }) {
  if (state === 'searching') return <rect class="bb-bot-avatar__scan" {...SCAN} />
  if (state === 'answering') return <path class="bb-uxai-bot__smile" d={SMILE} stroke-width={SMILE_WIDTH} />
  return <RobotEyes />
}

function Bubble({ state }: { state: UxaiBotState }) {
  return (
    <g class="bb-uxai-bot__bubble">
      <path class="bb-uxai-bot__bubble-shape" d={BUBBLE} stroke-width={BUBBLE_STROKE} />
      {state === 'searching'
        ? BUBBLE_DOTS.map((dot) => <circle key={dot.cx} class="bb-uxai-bot__dot" {...dot} />)
        : <path class="bb-uxai-bot__lines" d={BUBBLE_LINES} stroke-width={BUBBLE_LINE_WIDTH} />}
    </g>
  )
}
