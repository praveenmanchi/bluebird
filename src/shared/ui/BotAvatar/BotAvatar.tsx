import type { JSX } from 'preact'
import { BODY, EYES, FACE_SLEEPING, FACE_WORKING, MOTION, PUPILS, PUPIL_R, SHEEN, ZZZ, type BotAgent, type BotState } from './geometry'
import './BotAvatar.css'

export type { BotAgent, BotState } from './geometry'
export { BOT_AGENTS, BOT_STATES } from './geometry'

/** Display names, as the Figma "Agent" options read. */
export const BOT_AGENT_NAME: Record<BotAgent, string> = {
  accessibility: 'Accessibility',
  content: 'Content',
  writing: 'Writing',
  spelling: 'Spelling',
  'design-system': 'Design System',
  localization: 'Localization',
}

const STATE_WORD: Record<BotState, string> = { default: 'ready', working: 'working', sleeping: 'sleeping' }

export interface BotAvatarProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'state'> {
  /** Figma "Agent": Accessibility / Content / Writing / Spelling / Design System / Localization. */
  agent?: BotAgent
  /** Figma "State": Default (idle, looking around) / Working (hopping while it runs) / Sleeping (between runs). */
  state?: BotState
  /** Accessible name. Defaults to "<Agent> agent, <state>"; pass '' when a visible label already names the agent. */
  label?: string
}

/** Figma "Bot Avatar" (40000295:8478): the flat mascot of one AI agent, coloured by agents/bot/<agent>. */
export function BotAvatar({ agent = 'accessibility', state = 'default', label, class: cls, ...rest }: BotAvatarProps) {
  const name = label ?? `${BOT_AGENT_NAME[agent]} agent, ${STATE_WORD[state]}`
  const body = BODY[agent]
  const working = state === 'working'
  return (
    <svg
      {...rest}
      class={`bb-bot-avatar ${cls ?? ''}`}
      data-agent={agent}
      data-state={state}
      viewBox="0 0 40 40"
      fill="none"
      role={name ? 'img' : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
    >
      <g class="bb-bot-avatar__figure">
        <path
          class="bb-bot-avatar__body"
          d={working ? body.working : body.rest}
          transform={working && body.workingOffsetX ? `translate(${body.workingOffsetX} 0)` : undefined}
        />
        <ellipse
          class="bb-bot-avatar__sheen"
          cx={SHEEN.cx} cy={SHEEN.cy} rx={SHEEN.rx} ry={SHEEN.ry}
          transform={`rotate(${SHEEN.rotate} ${SHEEN.cx} ${SHEEN.cy})`}
        />
        {state === 'default' && <Eyes />}
        {working && <path class="bb-bot-avatar__face-line" d={FACE_WORKING} />}
        {state === 'sleeping' && <path class="bb-bot-avatar__face-line" d={FACE_SLEEPING} />}
      </g>
      {working && <path class="bb-bot-avatar__motion" d={MOTION} />}
      {state === 'sleeping' && <path class="bb-bot-avatar__zzz" d={ZZZ} />}
    </svg>
  )
}

/** Default face: two white eyes with agent-coloured pupils that glance around. */
function Eyes() {
  return (
    <g class="bb-bot-avatar__eyes">
      {EYES.map((d) => <path key={d} class="bb-bot-avatar__eye" d={d} />)}
      <g class="bb-bot-avatar__pupils">
        {PUPILS.map((p) => <circle key={p.cx} class="bb-bot-avatar__pupil" cx={p.cx} cy={p.cy} r={PUPIL_R} />)}
      </g>
    </g>
  )
}
