import { AiScenario, type AiScenarioAction, type BotAgent, type BotSceneId } from '@shared/ui'
import type { AgentDef } from '../agents'
import './AgentsScenario.css'

export interface AgentsScenarioProps {
  scene: BotSceneId
  agent: AgentDef
  /** The agent wearing the scene (its colour and chest icon). */
  bot: BotAgent
  provider?: string
  body?: string
  actions: readonly AiScenarioAction[]
}

/** Figma "AI scenarios" agent screens: the scene fills the tab. */
export function AgentsScenario({ scene, agent, bot, provider, body, actions }: AgentsScenarioProps) {
  return (
    <div class="bb-agents-scenario">
      <AiScenario surface="agents" scene={scene} character={bot} agent={agent.name} provider={provider} body={body} actions={actions} />
    </div>
  )
}
