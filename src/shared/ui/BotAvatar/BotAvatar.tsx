import type { JSX } from 'preact'
import { ICONS } from '../Icon/Icon'
import {
  ARMS, BRACKETS, EARS, EMBLEM, EYES, EYES_SHUT, FRAME_CENTRE, HEAD, HOVER, LINE_WIDTH, NECK, OPACITY, SCAN, SHIELD, THRUST, THRUSTER, TORSO, VISOR, ZZZ,
  type BotAgent, type BotState,
} from './geometry'
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
      <ellipse
        class="bb-bot-avatar__hover"
        cx={HOVER.cx} cy={HOVER.cy} rx={sleeping ? HOVER.restRx : HOVER.rx} ry={HOVER.ry}
        opacity={sleeping ? OPACITY.hoverRest : OPACITY.hover}
      />
      <g class="bb-bot-avatar__figure">
        <rect class="bb-bot-avatar__thruster" {...THRUSTER} />
        {working && <path class="bb-bot-avatar__thrust" d={THRUST} stroke-width={LINE_WIDTH} />}
        {ARMS.map(({ raised, ...arm }) => (
          <g key={arm.x} transform={working ? raised : undefined}>
            <rect class="bb-bot-avatar__arm" {...arm} opacity={OPACITY.limb} />
          </g>
        ))}
        {EARS.map((ear) => <rect key={ear.x} class="bb-bot-avatar__ear" {...ear} opacity={OPACITY.limb} />)}
        <rect class="bb-bot-avatar__neck" {...NECK} opacity={OPACITY.neck} />
        <rect class="bb-bot-avatar__head" {...HEAD} />
        <rect class="bb-bot-avatar__visor" x={VISOR.x} y={VISOR.y} width={VISOR.width} height={VISOR.height} rx={VISOR.rx} stroke-width={VISOR.strokeWidth} />
        <Face state={state} />
        <rect class="bb-bot-avatar__torso" {...TORSO} />
        <g class="bb-bot-avatar__emblem" opacity={sleeping ? OPACITY.emblemRest : undefined}>
          <path class="bb-bot-avatar__shield" d={SHIELD} />
          <EmblemIcon agent={agent} />
        </g>
      </g>
      {working && <path class="bb-bot-avatar__brackets" d={BRACKETS} stroke-width={LINE_WIDTH} />}
      {sleeping && <path class="bb-bot-avatar__zzz" d={ZZZ} />}
    </svg>
  )
}

/** What shows on the visor: eyes when ready, a scan line when working, two dashes when asleep. */
function Face({ state }: { state: BotState }) {
  if (state === 'working') return <rect class="bb-bot-avatar__scan" {...SCAN} />
  if (state === 'sleeping') return <>{EYES_SHUT.map((eye) => <rect key={eye.x} class="bb-bot-avatar__eye bb-bot-avatar__eye--shut" {...eye} />)}</>
  return <g class="bb-bot-avatar__eyes">{EYES.map((eye) => <rect key={eye.x} class="bb-bot-avatar__eye" {...eye} />)}</g>
}

/** The Figma "Icon" layer: the same library glyph <Icon> draws, placed in the bot's own 40-unit frame. */
function EmblemIcon({ agent }: { agent: BotAgent }) {
  const { icon, size, cy } = EMBLEM[agent]
  const glyph = ICONS[icon]
  if (!glyph) return null // not shipped in this bundle (see Icon/generated.active.ts)
  return (
    <svg
      class="bb-bot-avatar__icon"
      data-icon={icon}
      x={FRAME_CENTRE - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      viewBox={glyph.viewBox}
      fill="none"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: glyph.body }}
    />
  )
}
