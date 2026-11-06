// What UX AI and the agents say for each scenario. The joke lives in the title and the picture;
// the body always says what happened and what to do. Mirrors the Figma AI scenarios page.
import type { AiFailureKind } from '@shared/ai'
import type { BotSceneId } from '../BotScene/BotScene'

export type AiScenarioSurface = 'uxai' | 'agents'

export interface ScenarioContext {
  surface: AiScenarioSurface
  /** "Claude": who failed to answer. */
  provider?: string
  /** "UX writing": the agent that hit the problem. */
  agent?: string
}

export interface ScenarioCopy { title: string; body: string }

const FAILURE_SCENE: Record<AiFailureKind, BotSceneId> = {
  network: 'wire-cut',
  lost: 'connection-lost',
  timeout: 'timed-out',
  key: 'wrong-key',
  rate: 'too-many-requests',
  model: 'default-needed',
  unreadable: 'something-broke',
  other: 'something-broke',
}

export const sceneForFailure = (kind: AiFailureKind): BotSceneId => FAILURE_SCENE[kind]

const NOTHING_CHANGED = 'Nothing in your file changed.'

export function scenarioCopy(scene: BotSceneId, { surface, provider = 'your AI provider', agent = 'The agent' }: ScenarioContext): ScenarioCopy {
  const agents = surface === 'agents'
  switch (scene) {
    case 'no-connection':
      return agents
        ? { title: 'These agents aren’t plugged in', body: 'UX writing and Spelling & grammar need an AI connection. The other agents work without one.' }
        : { title: 'I’m not plugged in', body: 'UX AI needs an AI connection before it can write answers. Add one in Settings and I’ll get to work.' }
    case 'default-needed':
      return { title: 'Which one do I plug into?', body: 'There’s no working default connection, or the default model no longer exists. Pick one under Answer with.' }
    case 'wire-cut':
      return {
        title: 'Someone tripped over the wire',
        body: agents ? `${agent} couldn’t reach ${provider}, so the run stopped. ${NOTHING_CHANGED}` : `I couldn’t reach ${provider}. Check your internet connection, then try again.`,
      }
    case 'connection-lost':
      return agents
        ? { title: 'The line dropped mid-run', body: `${agent} lost ${provider} part way through. ${NOTHING_CHANGED}` }
        : { title: 'The line dropped mid-sentence', body: `I lost ${provider} halfway through your answer. Your question is safe, so try again and I’ll start over.` }
    case 'wrong-key':
      return { title: 'This key doesn’t fit', body: `${provider} turned down your API key. Update it in Settings and I’ll try the door again.` }
    case 'too-many-requests':
      return { title: 'I need a minute', body: `${provider} is busy, or we’ve asked too much for now. Wait a minute, then try again.` }
    case 'timed-out':
      return {
        title: 'I fell asleep waiting',
        body: agents ? `${provider} took too long to reply, so ${agent} stopped. Try a smaller scope, like one frame.` : `${provider} took too long to reply. Try again, or ask something shorter.`,
      }
    case 'something-broke':
      return {
        title: 'Well, that wasn’t meant to happen',
        body: agents ? `${agent} hit an error and stopped. ${NOTHING_CHANGED}` : `${provider} sent a reply I couldn’t read. Try asking again.`,
      }
    case 'empty-shelf':
      return { title: 'My bookshelf is empty', body: 'No libraries are connected, so I can only answer with sample data. Add your files in Settings › Dual File Mode.' }
    case 'unreadable':
      return { title: 'I can’t read these libraries', body: 'Figma wouldn’t open one of your library files. Check you still have access, then try again.' }
    case 'no-answer':
      return { title: 'I looked everywhere', body: 'Nothing in your sources matches that. Try different words, or add another source.' }
    case 'nothing-selected':
      return agents
        ? { title: 'Nothing to check', body: 'The scope is Selection, but nothing is selected. Select a frame in Figma, or change the scope.' }
        : { title: 'My hands are empty', body: 'You asked about your selection, but nothing is selected. Select a layer in Figma, then ask again.' }
    case 'all-clear':
      return { title: 'Nothing to fix!', body: `${agent} checked everything in scope and it all looks great. Go you.` }
    case 'fix-stuck':
      return { title: 'Some bolts won’t turn', body: 'Figma wouldn’t let some fixes through, usually because those layers are locked or were removed.' }
  }
}
