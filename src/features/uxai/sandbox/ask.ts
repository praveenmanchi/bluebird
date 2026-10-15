// UX AI's model handlers, built from injected dependencies so the same code runs
// in Figma (handler.ts wires figma.clientStorage + Figma's fetch), the dev harness
// and tests. Owns the connection: Settings › AI Agent Assistance in, text out,
// through whichever provider (Claude, OpenAI, Gemini) Settings pick.
import * as z from 'zod/mini'
import type { HandlerMap } from '@shared/bridge'
import { AiError, complete, describeProvider, isProviderConfig, PROVIDER_LABEL, providerId, selectProvider, type AiFetch } from '@shared/ai'
import { normalizeIntegration, sectionSchemas, testMessage, type ConnectionTestResult, type IntegrationValues } from '@shared/integrations'
import { MSG, askRequestSchema, type AskResult } from '../messages'
import { systemPrompt } from '../prompt'

/** Answers are a few sentences; the artifacts carry the detail. */
export const MAX_TOKENS = 1024

export interface AskDeps {
  readSettings: () => Promise<IntegrationValues<'ai'>>
  fetch: AiFetch
}

export function createAskHandlers(deps: AskDeps): HandlerMap {
  async function ask(payload: unknown): Promise<AskResult> {
    const { messages } = askRequestSchema.parse(payload)
    const config = selectProvider(await deps.readSettings())
    if (!isProviderConfig(config)) return { status: 'not-configured', reason: config.reason }
    const text = await complete(config, { system: systemPrompt(config.instructions), messages, maxTokens: MAX_TOKENS }, deps.fetch)
    return { status: 'answered', text, model: config.model, provider: config.provider }
  }

  /** Settings › Test Connection for AI Agent Assistance: the form's unsaved key and model for the picked provider, one tiny request. */
  async function test(payload: unknown): Promise<ConnectionTestResult> {
    const parsed = z.safeParse(sectionSchemas.ai, payload)
    if (!parsed.success) throw new AiError('Those AI settings are incomplete or too long.', 0, 'claude')
    const values = normalizeIntegration<'ai'>(parsed.data, 'ai')
    const config = selectProvider({ ...values, enabled: true })
    if (!isProviderConfig(config)) throw new AiError('Add an API key for the provider under “Answer with” to test the connection.', 0, providerId(values.provider))
    await complete(config, { system: 'Reply with the single word OK.', messages: [{ role: 'user', content: 'Connection test.' }], maxTokens: 16 }, deps.fetch)
    const wanted = PROVIDER_LABEL[providerId(values.provider)]
    return { message: `${describeProvider(config)} answered.${config.fallback ? ` “Answer with” names ${wanted}, which has no key, so ${PROVIDER_LABEL[config.provider]} is used instead.` : ''}` }
  }

  return {
    [MSG.ask]: ask,
    [testMessage('ai')]: test,
  }
}
