// Tab actions on fixtures: send a prompt, fake the thinking with a timer, stop it,
// toggle sources, swap variables. Every update replaces state; nothing mutates in place.
import { ANSWERS, answerKindFor, type AnswerKind, type CannedAnswer, type PanelMode } from './fixtures'
import { failedAnswer, PENDING_ANSWER, type GroundedAnswer } from './grounding'
import { draft, panelMode, setTimer, sources, turns, variables, view, type Turn } from './state'

/** Builds a turn's answer from the Dual File libraries (the Tab supplies it while they are loaded). */
export type Ground = (prompt: string, kind: AnswerKind) => Promise<GroundedAnswer>

/** Delay before each Thinking Step finishes (the whole answer takes steps × this). */
export const STEP_MS = 700

let nextId = 1

/** The reply a turn shows: grounded in the libraries when it was asked against them, else the canned one. */
export function answerFor(turn: Pick<Turn, 'kind' | 'grounded'>): CannedAnswer {
  return turn.grounded ?? ANSWERS[turn.kind]
}

/** Steps a turn walks through; a stepless answer still "thinks" for one tick. */
export function stepCount(turn: Pick<Turn, 'kind' | 'grounded'>): number {
  return Math.max(answerFor(turn).steps.length, 1)
}

export function thinkingTurn(): Turn | undefined {
  return turns.value.find((t) => t.status === 'thinking')
}

function updateTurn(id: string, patch: Partial<Turn>): void {
  turns.value = turns.value.map((t) => (t.id === id ? { ...t, ...patch } : t))
}

function tick(id: string): void {
  setTimer(setTimeout(() => {
    setTimer(null)
    const turn = turns.value.find((t) => t.id === id)
    if (!turn || turn.status !== 'thinking') return
    const progress = turn.progress + 1
    if (progress >= stepCount(turn)) {
      updateTurn(id, { progress, status: 'done' })
      return
    }
    updateTurn(id, { progress })
    tick(id)
  }, STEP_MS))
}

/**
 * Ask a question: adds the user turn, switches to the chat, and thinks before answering. With
 * `ground` the answer is looked up in the libraries first, then its real steps play out.
 */
export function send(prompt: string, ground?: Ground): void {
  const text = prompt.trim()
  if (!text || thinkingTurn()) return
  const kind = answerKindFor(text)
  const turn: Turn = { id: `turn-${nextId++}`, prompt: text, kind, status: 'thinking', progress: 0, ...(ground ? { grounded: PENDING_ANSWER } : {}) }
  turns.value = [...turns.value, turn]
  draft.value = ''
  view.value = 'chat'
  if (!ground) { tick(turn.id); return }
  const settle = (answer: GroundedAnswer) => {
    // Stopped (or reset) while the lookup ran: leave the turn as it is.
    if (turns.value.find((t) => t.id === turn.id)?.status !== 'thinking') return
    updateTurn(turn.id, { grounded: answer })
    tick(turn.id)
  }
  ground(text, kind).then(settle, (error: unknown) => settle(failedAnswer(error instanceof Error ? error.message : 'Something went wrong.')))
}

/** The Chat Input's Stop: cancels the timer and leaves the turn unanswered. */
export function stop(): void {
  const turn = thinkingTurn()
  if (!turn) return
  setTimer(null)
  updateTurn(turn.id, { status: 'stopped' })
}

export function showSources(): void { view.value = 'sources' }
/** Close "Manage sources": back to the conversation, or to the welcome before the first question. */
export function showChat(): void { view.value = 'chat' }

export function toggleSource(id: string, selected: boolean): void {
  sources.value = sources.value.map((s) => (s.id === id ? { ...s, selected } : s))
}

/** Point a row's Swap at another variable; the row reads Changed until applied or discarded. */
export function swapVariable(index: number, value: string): void {
  variables.value = variables.value.map((v, i) => (i === index ? { ...v, value } : v))
}

export function discardSwaps(): void {
  variables.value = variables.value.map((v) => ({ ...v, value: v.token }))
}

/** Apply makes each pending swap the binding. */
export function applySwaps(): void {
  variables.value = variables.value.map((v) => ({ ...v, token: v.value }))
}

export function setPanelMode(mode: PanelMode): void { panelMode.value = mode }
