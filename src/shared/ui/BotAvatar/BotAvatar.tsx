import type { JSX } from 'preact'
import { BRACKETS, EMBLEM, EYES_SHUT, LINE_WIDTH, SCAN, ZZZ, type BotAgent, type BotState } from './geometry'
import { Robot, RobotEyes } from './Robot'
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
  /** Figma "State": Default (idle) / Working (scanning, thrusters on) / Sleeping (between runs). */
  state?: BotState
  /** Accessible name. Defaults to "<Agent> agent, <state>"; pass '' when a visible label already names the agent. */
  label?: string
}

/** Figma "Bot Avatar" (40000295:8478): a hover robot wearing its job as a library icon on its chest. */
export function BotAvatar({ agent = 'accessibility', state = 'default', label, class: cls, ...rest }: BotAvatarProps) {
  const name = label ?? `${BOT_AGENT_NAME[agent]} agent, ${STATE_WORD[state]}`
  const working = state === 'working'
  const sleeping = state === 'sleeping'
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
      <Robot pose={working ? 'active' : sleeping ? 'rest' : 'idle'} face={<Face state={state} />} emblem={EMBLEM[agent]} />
      {working && <path class="bb-bot-avatar__brackets" d={BRACKETS} stroke-width={LINE_WIDTH} />}
      {sleeping && <path class="bb-bot-avatar__zzz" d={ZZZ} />}
    </svg>
  )
}

/** What shows on the visor: eyes when ready, a scan line when working, two dashes when asleep. */
function Face({ state }: { state: BotState }) {
  if (state === 'working') return <rect class="bb-bot-avatar__scan" {...SCAN} />
  if (state === 'sleeping') return <>{EYES_SHUT.map((eye) => <rect key={eye.x} class="bb-bot-avatar__eye bb-bot-avatar__eye--shut" {...eye} />)}</>
  return <RobotEyes />
}
