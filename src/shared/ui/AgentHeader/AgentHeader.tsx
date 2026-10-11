import type { ComponentChildren, JSX } from 'preact'
import { BotAvatar, type BotAgent, type BotState } from '../BotAvatar/BotAvatar'
import { ContextChip } from '../ContextChip/ContextChip'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './AgentHeader.css'

const DEFAULT_CHIPS = ['WCAG 2.2 AA · 86 rules', 'Brand UI · 5 modes'] as const

export interface AgentHeaderProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'name'> {
  /** Figma "Name". */
  name?: ComponentChildren
  /** Figma "Purpose". */
  purpose?: ComponentChildren
  /** The "Bot" Bot Avatar instance's Agent (Accessibility in Figma). */
  agent?: BotAgent
  /** The "Bot" Bot Avatar instance's State (Working in Figma). */
  botState?: BotState
  /** The "Chips" row: Context Chip (Citation) labels — the agent's rule pack and scope. */
  chips?: readonly ComponentChildren[]
  /** The "Status" Meta Badge label ("Running" in Figma). Pass null to hide it. */
  status?: ComponentChildren
  /** The "Status" Meta Badge tone (Accent in Figma). */
  statusTone?: MetaBadgeTone
}

/** Figma "Agent Header" (40000296:8380): who the open agent is, what it checks against, and whether it runs. */
export function AgentHeader({
  name = 'Accessibility agent',
  purpose = 'Expert in WCAG 2.2. Reviews your selection, frame or page, explains every issue and can fix it with your tokens.',
  agent = 'accessibility', botState = 'working', chips = DEFAULT_CHIPS,
  status = 'Running', statusTone = 'accent', class: cls, ...rest
}: AgentHeaderProps) {
  return (
    <header {...rest} class={`bb-agent-header ${cls ?? ''}`}>
      <BotAvatar agent={agent} state={botState} label="" class="bb-agent-header__bot" />
      <div class="bb-agent-header__text">
        <h2 class="bb-agent-header__name">{name}</h2>
        <p class="bb-agent-header__purpose">{purpose}</p>
        {chips.length > 0 && (
          <div class="bb-agent-header__chips">
            {chips.map((chip, i) => <ContextChip key={i} type="citation">{chip}</ContextChip>)}
          </div>
        )}
      </div>
      {status !== null && status !== undefined && <MetaBadge tone={statusTone} class="bb-agent-header__status">{status}</MetaBadge>}
    </header>
  )
}
