// UX AI's Claude handlers, built from injected dependencies so the same code runs
// in Figma (handler.ts wires figma.clientStorage + Figma's fetch), the dev harness
// and tests. Owns the Claude connection: Settings › AI Agent Assistance in, text out.
import * as z from 'zod/mini'
import type { HandlerMap } from '@shared/bridge'
import { normalizeIntegration, sectionSchemas, testMessage, type ConnectionTestResult, type IntegrationValues } from '@shared/integrations'
import { askClaude, claudeConfig, ClaudeError, isClaudeConfig, type ClaudeFetch } from '../claude'
import { MSG, askRequestSchema, type AskResult } from '../messages'
import { systemPrompt } from '../prompt'

export interface AskDeps {
  readSettings: () => Promise<IntegrationValues<'ai'>>
  fetch: ClaudeFetch
}

export function createAskHandlers(deps: AskDeps): HandlerMap {
  async function ask(payload: unknown): Promise<AskResult> {
    const { messages } = askRequestSchema.parse(payload)
    const config = claudeConfig(await deps.readSettings())
    if (!isClaudeConfig(config)) return { status: 'not-configured', reason: config.reason }
    const text = await askClaude(config, systemPrompt(config.instructions), messages, deps.fetch)
    return { status: 'answered', text, model: config.model }
  }

  /** Settings › Test Connection for AI Agent Assistance: the form's unsaved Claude key and model, one tiny request. */
  async function test(payload: unknown): Promise<ConnectionTestResult> {
    const parsed = z.safeParse(sectionSchemas.ai, payload)
    if (!parsed.success) throw new ClaudeError('Those AI settings are incomplete or too long.', 0)
    const values = normalizeIntegration<'ai'>(parsed.data, 'ai')
    const config = claudeConfig({ ...values, enabled: true })
    if (!isClaudeConfig(config)) {
      const others = [values.openaiKey && 'OpenAI', values.geminiKey && 'Gemini'].filter(Boolean)
      throw new ClaudeError(others.length
        ? `Only Claude is wired up so far; add a Claude API key to test. (${others.join(' and ')} ${others.length === 1 ? 'isn’t' : 'aren’t'} used yet.)`
        : 'Add a Claude API key to test the connection.', 0)
    }
    await askClaude(config, 'Reply with the single word OK.', [{ role: 'user', content: 'Connection test.' }], deps.fetch, 5)
    return { message: `Claude answered with ${config.model}.${values.openaiKey || values.geminiKey ? ' OpenAI and Gemini keys aren’t used yet.' : ''}` }
  }

  return {
    [MSG.ask]: ask,
    [testMessage('ai')]: test,
  }
}
