import type { ComponentChildren, JSX } from 'preact'
import { BotAvatar, type BotAgent, type BotState } from '../BotAvatar/BotAvatar'
import { Button, type ButtonVariant } from '../Button/Button'
import { ContextChip } from '../ContextChip/ContextChip'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './AgentCard.css'

export type AgentCardState = 'ready' | 'running' | 'idle' | 'coming-soon'

interface StateSpec {
  bot: BotState
  tone: MetaBadgeTone
  status: string
  meta: string
  action: string
  variant: ButtonVariant
}

/** What each Figma State variant puts in the nested instances, and its default copy. */
const STATE: Record<AgentCardState, StateSpec> = {
  ready: { bot: 'default', tone: 'success', status: 'Ready', meta: 'Last run 2h ago · 14 issues', action: 'Run', variant: 'primary' },
  running: { bot: 'working', tone: 'accent', status: 'Running 64%', meta: 'Checking 8 of 12 frames…', action: 'Stop', variant: 'secondary' },
  idle: { bot: 'sleeping', tone: 'neutral', status: 'Idle', meta: 'Not run on this file yet', action: 'Run', variant: 'secondary' },
  'coming-soon': { bot: 'default', tone: 'neutral', status: 'Coming soon', meta: 'Joining in Q1', action: 'Notify me', variant: 'secondary' },
}

export interface AgentCardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'name'> {
  /** Figma "State": Ready / Running / Idle / Coming soon. Sets the bot state, badge, footer copy and action. */
  state?: AgentCardState
  /** Figma "Name". */
  name?: ComponentChildren
  /** Figma "Purpose". */
  purpose?: ComponentChildren
  /** The "Bot" Bot Avatar instance's Agent (Accessibility in Figma). */
  agent?: BotAgent
  /** The "Rules" Context Chip (Citation) label. Pass null to hide it. */
  rules?: ComponentChildren
  /** The footer "Meta" text; defaults to the Figma copy for the state. */
  meta?: ComponentChildren
  /** The "Status" Meta Badge label; defaults to the Figma copy for the state. */
  status?: ComponentChildren
  /** The "Action" Button label; defaults to the Figma copy for the state. */
  actionLabel?: ComponentChildren
  /** Run pressed (Ready / Idle). */
  onRun?: () => void
  /** Stop pressed (Running). */
  onStop?: () => void
}

/** Figma "Agent Card" (40000296:8379): one agent in the gallery — mascot, status, purpose, rule pack and its run action. */
export function AgentCard({
  state = 'ready',
  name = 'Accessibility',
  purpose = 'Reviews contrast, target size, focus and text spacing against WCAG 2.2 in every brand mode.',
  agent = 'accessibility', rules = 'WCAG 2.2 AA · 86 rules',
  meta, status, actionLabel, onRun, onStop, class: cls, ...rest
}: AgentCardProps) {
  const spec = STATE[state]
  const soon = state === 'coming-soon'
  return (
    <article {...rest} class={`bb-agent-card ${cls ?? ''}`} data-state={state}>
      <div class="bb-agent-card__top">
        <BotAvatar agent={agent} state={spec.bot} label="" class="bb-agent-card__bot" />
        <MetaBadge tone={spec.tone} class="bb-agent-card__status">{status ?? spec.status}</MetaBadge>
      </div>
      <h3 class="bb-agent-card__name">{name}</h3>
      <p class="bb-agent-card__purpose">{purpose}</p>
      {rules !== null && rules !== undefined && <ContextChip type="citation" class="bb-agent-card__rules">{rules}</ContextChip>}
      <div class="bb-agent-card__footer">
        <span class="bb-agent-card__meta">{meta ?? spec.meta}</span>
        <Button
          variant={spec.variant}
          disabled={soon}
          onClick={soon ? undefined : state === 'running' ? onStop : onRun}
          class="bb-agent-card__action"
        >
          {actionLabel ?? spec.action}
        </Button>
      </div>
    </article>
  )
}
