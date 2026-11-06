// Fixture sandbox for browser-only development (?mode=mock) and UI tests: runs
// stream the sample findings on a timer, writes succeed without a document.
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import { SAMPLE_FINDINGS, SAMPLE_SCOPES, SAMPLE_STEPS, sampleRun } from './fixtures'
import {
  MSG, annotateRequestSchema, applyRequestSchema, chatRequestSchema, focusRequestSchema, reportRequestSchema, runRequestSchema, scopeRequestSchema, stopRequestSchema,
  type AnnotateResult, type ApplyResult, type ChatResult, type ReportResult, type RunProgress, type RunResult, type RunStep,
} from './messages'

export interface AgentsMockOptions {
  /** Milliseconds between progress ticks; tests pass 0-ish and advance fake timers. */
  tickMs?: number
  /** What `agents:chat` answers; omitted, a canned reply mentioning the run. */
  chat?: (payload: unknown) => Promise<ChatResult>
}

export const MOCK_TICK_MS = 150
/** Progress per tick: a whole run takes 100 / STEP ticks. */
export const MOCK_STEP = 4

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function createMockHandlers({ tickMs = MOCK_TICK_MS, chat }: AgentsMockOptions = {}): HandlerMap {
  const stops = new Set<string>()
  return {
    [MSG.focus]: async (payload: unknown) => { focusRequestSchema.parse(payload) },
    [MSG.scope]: async (payload: unknown) => SAMPLE_SCOPES[scopeRequestSchema.parse(payload).scope],
    [MSG.stop]: async (payload: unknown) => { stops.add(stopRequestSchema.parse(payload).runId) },
    [MSG.run]: async (payload: unknown, ctx: HandlerContext): Promise<RunResult> => {
      const request = runRequestSchema.parse(payload)
      const all = SAMPLE_FINDINGS[request.agent]
      const labels = SAMPLE_STEPS[request.agent]
      const size = SAMPLE_SCOPES[request.scope]
      let sent = 0
      for (let percent = MOCK_STEP; percent <= 100; percent += MOCK_STEP) {
        await wait(tickMs)
        if (stops.has(request.runId)) { stops.delete(request.runId); return { ...sampleRun(request.agent, request.scope, request.runId), findings: all.slice(0, sent), stopped: true } }
        const reveal = Math.min(all.length, Math.floor((percent * (all.length + 1)) / 100))
        const stepsDone = Math.min(labels.length, Math.ceil((percent / 100) * labels.length))
        const progress: RunProgress = {
          runId: request.runId, agent: request.agent, percent,
          label: `Checking ${Math.round((size.frames * percent) / 100)} of ${size.frames} frames · ${Math.round((size.layers * percent) / 100)} of ${size.layers} layers`,
          steps: labels.map((label, i): RunStep => ({ label, status: i < stepsDone - 1 || percent >= 100 ? 'done' : 'running' })).slice(0, Math.max(1, stepsDone)),
          findings: all.slice(sent, reveal),
        }
        sent = reveal
        ctx.emit(MSG.progress, progress)
      }
      return sampleRun(request.agent, request.scope, request.runId)
    },
    [MSG.apply]: async (payload: unknown): Promise<ApplyResult> => {
      const { fixes } = applyRequestSchema.parse(payload)
      // Fixture layers don't exist: the mock pretends every token/text fix lands.
      return { applied: fixes.filter((f) => f.fix.kind !== 'manual').map((f) => f.id), failed: fixes.filter((f) => f.fix.kind === 'manual').map((f) => ({ id: f.id, reason: 'This fix needs a designer' })) }
    },
    [MSG.annotate]: async (payload: unknown): Promise<AnnotateResult> => ({ annotated: annotateRequestSchema.parse(payload).findings.length }),
    [MSG.report]: async (payload: unknown): Promise<ReportResult> => ({ nodeId: 'fixture:report', name: `UX AI agents · ${reportRequestSchema.parse(payload).title}` }),
    [MSG.chat]: chat ?? (async (payload: unknown): Promise<ChatResult> => {
      const { messages } = chatRequestSchema.parse(payload)
      const last = messages[messages.length - 1]!.content.toLowerCase()
      const text = /fix|apply/.test(last) ? 'Applying the safe fixes now; the rest need a design decision. [apply-safe]'
        : /show|see|list/.test(last) ? 'Here are the findings. [show-findings]'
          : /report|canvas/.test(last) ? 'Drawing the report frame next to the scope. [report]'
            : 'I found 14 issues in 3 frames across 8 brand modes; 6 can be fixed safely with tokens. Say “apply the safe fixes” and I’ll do it.'
      return { status: 'answered', text, provider: 'claude', model: 'claude-opus-5-5' }
    }),
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
