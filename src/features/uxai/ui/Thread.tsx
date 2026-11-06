import type { ComponentChildren } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { AiScenario, ColorArtifact, ComponentArtifact, Message, PromptChip, ThinkingStep, TypeArtifact, type AiScenarioAction, type BotSceneId } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { NODES, type AnswerKind } from '../fixtures'
import type { Turn } from '../state'
import { answerFor, showSources, stepCount } from '../chat'
import { LibraryAnswer } from './LibraryAnswer'

export interface ThreadProps {
  turns: readonly Turn[]
  /** The Variables panel a Selection answer shows (only the latest turn gets the live one). */
  variablesPanel?: ComponentChildren
  onSend?: (prompt: string) => void
  onFocusNode?: (nodeId: string) => void
  /** Open a library link (a grounded answer's "Open in Figma"). */
  onOpenUrl?: (url: string) => void
}

/** Figma "Indent": content aligned with the assistant text, past the bot's gutter. */
function Indent({ children, label }: { children: ComponentChildren; label?: string }) {
  return (
    <div class="bb-uxai-indent" aria-label={label}>
      <span class="bb-uxai-gutter" aria-hidden="true" />
      {children}
    </div>
  )
}

function Artifact({ kind, panel, onFocusNode }: { kind: AnswerKind; panel?: ComponentChildren; onFocusNode?: (nodeId: string) => void }) {
  if (kind === 'color') return <ColorArtifact class="bb-uxai-artifact" />
  if (kind === 'component') return <ComponentArtifact class="bb-uxai-artifact" onOpen={() => onFocusNode?.(NODES.button)} />
  if (kind === 'type') return <TypeArtifact class="bb-uxai-artifact" />
  if (kind === 'selection' && panel) return <>{panel}</>
  return null
}

/** Figma Thinking frame while the answer is still running: finished steps, then the running one. */
function Working({ turn }: { turn: Turn }) {
  const answer = answerFor(turn)
  const steps = answer.steps.length ? answer.steps : [answer.hint]
  const total = stepCount(turn)
  const visible = steps.slice(0, Math.min(turn.progress + 1, total))
  const answering = total > 1 && turn.progress >= total - 1
  return (
    <>
      <Message role="assistant" text={answer.searching} botState={answering ? 'answering' : 'searching'} />
      <Indent label="Reasoning">
        <div class="bb-uxai-thinking" role="status">
          {visible.map((step, i) => (
            <ThinkingStep key={step} status={i < turn.progress ? 'done' : 'running'}>{step}</ThinkingStep>
          ))}
        </div>
      </Indent>
    </>
  )
}

/** These have no answer to show: the scene is the whole reply. The rest keep the library answer below it. */
const NO_ANSWER: ReadonlySet<BotSceneId> = new Set<BotSceneId>(['no-answer', 'nothing-selected', 'unreadable'])

function scenarioActions(scene: BotSceneId, retry: () => void): readonly AiScenarioAction[] {
  const again = { label: 'Try again', onClick: retry }
  const settings = (label: string) => ({ label, onClick: requestSettings })
  switch (scene) {
    case 'wrong-key': return [settings('Update key')]
    case 'default-needed': return [settings('Choose a default')]
    case 'wire-cut': case 'unreadable': return [again, settings('Check Settings')]
    case 'no-answer': return [{ label: 'Add a source', onClick: showSources }]
    default: return [again]
  }
}

interface AnsweredProps {
  turn: Turn
  latest: boolean
  panel?: ComponentChildren
  onSend?: (prompt: string) => void
  onFocusNode?: (nodeId: string) => void
  onOpenUrl?: (url: string) => void
}

function Answered({ turn, latest, panel, onSend, onFocusNode, onOpenUrl }: AnsweredProps) {
  const answer = answerFor(turn)
  const livePanel = latest ? panel : undefined
  const grounded = turn.grounded
  const hasArtifact = grounded
    ? Boolean(grounded.variables || grounded.components || grounded.selection)
    : turn.kind === 'selection' ? livePanel !== undefined : turn.kind !== 'icons'
  const scenario = grounded?.scenario
  const scene = scenario && (
    <AiScenario
      surface="uxai"
      scene={scenario.scene}
      provider={scenario.provider}
      actions={latest ? scenarioActions(scenario.scene, () => onSend?.(turn.prompt)) : []}
    />
  )
  if (scenario && NO_ANSWER.has(scenario.scene)) return <>{scene}</>
  return (
    <>
      {scene}
      {answer.steps.length > 0 && (
        <Indent label="Reasoning">
          <div class="bb-uxai-thinking">
            <span class="bb-uxai-caption" data-weight="medium">{answer.thoughtFor}</span>
            {answer.steps.map((step) => <ThinkingStep key={step} status="done">{step}</ThinkingStep>)}
          </div>
        </Indent>
      )}
      <Message role="assistant" text={answer.text} />
      {hasArtifact && (
        <Indent>
          {grounded ? <LibraryAnswer answer={grounded} onOpenUrl={onOpenUrl} /> : <Artifact kind={turn.kind} panel={livePanel} onFocusNode={onFocusNode} />}
        </Indent>
      )}
      {latest && answer.followUps.length > 0 && (
        <Indent label="Follow-up questions">
          <div class="bb-uxai-suggestions">
            {answer.followUps.map((f) => <PromptChip key={f.label} icon={f.icon} onClick={() => onSend?.(f.label)}>{f.label}</PromptChip>)}
          </div>
        </Indent>
      )}
    </>
  )
}

/** Figma "Thread": bottom-aligned, scrolls once the conversation outgrows the body. */
export function Thread({ turns, variablesPanel, onSend, onFocusNode, onOpenUrl }: ThreadProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const last = turns[turns.length - 1]
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns.length, last?.status, last?.progress])

  return (
    <div class="bb-uxai-thread" ref={scroller} role="log" aria-label="Conversation">
      <div class="bb-uxai-thread__turns">
        {turns.map((turn) => (
          <div key={turn.id} class="bb-uxai-turn">
            <Message role="user" text={turn.prompt} />
            {turn.status === 'thinking' && <Working turn={turn} />}
            {turn.status === 'stopped' && <Message role="assistant" text="Stopped. Ask again when you’re ready." />}
            {turn.status === 'done' && <Answered turn={turn} latest={turn === last} panel={variablesPanel} onSend={onSend} onFocusNode={onFocusNode} onOpenUrl={onOpenUrl} />}
          </div>
        ))}
      </div>
    </div>
  )
}
