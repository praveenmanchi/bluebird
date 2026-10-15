// Runs inside Figma. Reads the document for the agents, asks the configured model
// with the key from Settings (never sent to the UI), and writes results back:
// fixes, Dev Mode annotations, a report frame.
import type { HandlerMap, HandlerContext } from '@shared/bridge'
import { complete, isProviderConfig, selectProvider, type AiFetch } from '@shared/ai'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import type { IntegrationValues } from '@shared/integrations'
import {
  MSG, annotateRequestSchema, applyRequestSchema, chatRequestSchema, focusRequestSchema, reportRequestSchema, runRequestSchema, scopeRequestSchema, stopRequestSchema,
  type ChatResult, type RunProgress, type RunResult, type ScopeInfo,
} from '../messages'
import { runAgent } from './run'
import { describeScope, scopeRoots } from './scope'
import { annotateFindings, applyFixes, drawReport } from './write'

export interface AgentsDeps {
  readAi: () => Promise<IntegrationValues<'ai'>>
  fetch: AiFetch
}

const CHAT_SYSTEM = [
  'You are one of the UX AI agents inside a Figma plugin, talking to the designer about the run you just did. The run context (scope, findings, what can be fixed) is in the first user message.',
  'Be brief and concrete: plain text, at most about 80 words, no Markdown. Refer to findings by their titles. When asked to do something the plugin can do (apply the safe fixes, write annotations, draw the report, open a finding), say so in one sentence and end with the exact phrase in square brackets: [apply-safe], [annotate], [report] or [show-findings].',
] as const

/** `deps` default to the plugin's clientStorage and fetch; tests inject their own. */
export function createAgentsHandlers(deps: AgentsDeps): HandlerMap {
  const stops = new Set<string>()

  async function focus(payload: unknown): Promise<void> {
    const { nodeId } = focusRequestSchema.parse(payload)
    const node = await figma.getNodeByIdAsync(nodeId)
    if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Layer no longer exists')
    figma.currentPage.selection = [node as SceneNode]
    figma.viewport.scrollAndZoomIntoView([node as SceneNode])
  }

  async function scope(payload: unknown): Promise<ScopeInfo> {
    return describeScope(scopeRequestSchema.parse(payload).scope)
  }

  async function run(payload: unknown, ctx: HandlerContext): Promise<RunResult> {
    const request = runRequestSchema.parse(payload)
    stops.delete(request.runId)
    try {
      return await runAgent(request, {
        readAi: deps.readAi,
        fetch: deps.fetch,
        emit: (progress: RunProgress) => ctx.emit(MSG.progress, progress),
        stopped: () => stops.has(request.runId),
      })
    } finally {
      stops.delete(request.runId)
    }
  }

  async function chat(payload: unknown): Promise<ChatResult> {
    const { messages, context } = chatRequestSchema.parse(payload)
    const config = selectProvider(await deps.readAi())
    if (!isProviderConfig(config)) return { status: 'not-configured', reason: config.reason }
    const [first, ...rest] = messages
    const text = await complete(config, {
      system: [...CHAT_SYSTEM, ...(config.instructions ? [`The design-system team’s instructions:\n${config.instructions}`] : [])].join('\n\n'),
      messages: [{ role: 'user', content: `Run context:\n${context}\n\n${first!.role === 'user' ? first!.content : ''}` }, ...(first!.role === 'user' ? rest : messages.slice(0))],
      maxTokens: 400,
    }, deps.fetch)
    return { status: 'answered', text, provider: config.provider, model: config.model }
  }

  return {
    [MSG.focus]: focus,
    [MSG.scope]: scope,
    [MSG.run]: run,
    [MSG.stop]: (payload: unknown) => { stops.add(stopRequestSchema.parse(payload).runId) },
    [MSG.apply]: (payload: unknown) => applyFixes(applyRequestSchema.parse(payload)),
    [MSG.annotate]: (payload: unknown) => annotateFindings(annotateRequestSchema.parse(payload).findings),
    [MSG.report]: async (payload: unknown) => {
      const request = reportRequestSchema.parse(payload)
      return drawReport(request, scopeRoots('selection').length ? scopeRoots('selection') : [])
    },
    [MSG.chat]: chat,
  }
}

export const handlers: HandlerMap = createAgentsHandlers({
  readAi: async () => (await readIntegrations(clientStorageRead)).ai,
  fetch: (url, init) => fetch(url, init),
})
