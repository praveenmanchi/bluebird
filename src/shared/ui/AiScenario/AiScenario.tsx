import type { JSX } from 'preact'
import { BotScene, type BotSceneCharacter, type BotSceneId } from '../BotScene/BotScene'
import { Button } from '../Button/Button'
import { scenarioCopy, type ScenarioContext } from './copy'
import './AiScenario.css'

export type { AiScenarioSurface, ScenarioContext, ScenarioCopy } from './copy'
export { scenarioCopy, sceneForFailure } from './copy'

export interface AiScenarioAction { label: string; onClick?: () => void }

export interface AiScenarioProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'>, ScenarioContext {
  scene: BotSceneId
  character?: BotSceneCharacter
  /** Replaces the standard body, when the screen knows more (how many fixes went in). */
  body?: string
  /** The first is the primary button. */
  actions?: readonly AiScenarioAction[]
}

/** A UX AI or agent failure or empty state: the Bot Scene, a funny title, and plain words on what to do. */
export function AiScenario({ scene, character, surface, provider, agent, body, actions = [], class: cls, ...rest }: AiScenarioProps) {
  const copy = scenarioCopy(scene, { surface, provider, agent })
  return (
    <section {...rest} class={`bb-ai-scenario ${cls ?? ''}`} role="status" aria-label={copy.title}>
      <BotScene scene={scene} character={character} />
      <h3 class="bb-ai-scenario__title">{copy.title}</h3>
      <p class="bb-ai-scenario__body">{body ?? copy.body}</p>
      {actions.length > 0 && (
        <div class="bb-ai-scenario__actions">
          {actions.map((action, i) => <Button key={action.label} variant={i === 0 ? 'primary' : 'secondary'} onClick={action.onClick}>{action.label}</Button>)}
        </div>
      )}
    </section>
  )
}
