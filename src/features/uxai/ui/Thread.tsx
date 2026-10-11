import type { ComponentChildren } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { ColorArtifact, ComponentArtifact, Message, PromptChip, ThinkingStep, TypeArtifact } from '@shared/ui'
import { NODES, type AnswerKind } from '../fixtures'
import type { Turn } from '../state'
import { answerFor, stepCount } from '../chat'
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

/** Figma "Indent": content aligned with the assistant text, past the orb's gutter. */
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
  const visible = steps.slice(0, Math.min(turn.progress + 1, stepCount(turn)))
  return (
    <>
      <Message role="assistant" text={answer.searching} orbState="searching" />
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
  return (
    <>
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
