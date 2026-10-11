// Anthropic Messages API for UX AI. Runs in the Figma sandbox (the key never
// reaches the UI) and in the dev harness; fetch is injected. api.anthropic.com
// answers CORS for browser callers that send the direct-browser-access header.
import type { IntegrationValues } from '@shared/integrations'

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'
/** Answers are a few sentences; the artifacts carry the detail. */
export const MAX_TOKENS = 1024
/** A long context plus a slow model can take a while; the UI waits a bit longer than this. */
export const CLAUDE_TIMEOUT_MS = 75_000

export type ClaudeFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ status: number; text(): Promise<string> }>

export class ClaudeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ClaudeError'
  }
}

export interface ClaudeConfig { apiKey: string; model: string; instructions: string }

/** The Claude connection Settings › AI Agent Assistance describe, or why there is none. */
export function claudeConfig(ai: IntegrationValues<'ai'>): ClaudeConfig | { reason: 'disabled' | 'no-key' } {
  if (!ai.enabled) return { reason: 'disabled' }
  if (!ai.claudeKey.trim()) return { reason: 'no-key' }
  return { apiKey: ai.claudeKey.trim(), model: ai.claudeModel, instructions: ai.instructions.trim() }
}

export const isClaudeConfig = (c: ReturnType<typeof claudeConfig>): c is ClaudeConfig => 'apiKey' in c

export interface ClaudeMessage { role: 'user' | 'assistant'; content: string }

/** Anthropic's own explanation from an error body ({ error: { message } }). */
function detail(body: string): string {
  try {
    return String((JSON.parse(body) as { error?: { message?: unknown } }).error?.message ?? '').trim()
  } catch {
    return ''
  }
}

function failure(status: number, body: string, model: string): ClaudeError {
  const said = detail(body)
  switch (status) {
    case 401: return new ClaudeError('Anthropic rejected the Claude API key. Check it in Settings › AI Agent Assistance.', status)
    case 403: return new ClaudeError(`This Claude API key isn’t allowed to do that.${said ? ` Anthropic said: ${said}` : ''}`, status)
    case 404: return new ClaudeError(`Anthropic doesn’t know the model “${model}”. Pick another Default Model in Settings.`, status)
    case 429: return new ClaudeError('Claude is rate-limiting this key. Wait a minute and try again.', status)
    case 529: return new ClaudeError('Claude is overloaded right now. Try again shortly.', status)
    default: return new ClaudeError(said ? `Claude couldn’t answer: ${said}` : `Claude answered ${status}.`, status)
  }
}

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms)
  work.then((v) => { clearTimeout(timer); resolve(v) }, (e: unknown) => { clearTimeout(timer); reject(e) })
})

/** One Messages API call; returns the reply's text blocks joined. */
export async function askClaude(config: ClaudeConfig, system: string, messages: readonly ClaudeMessage[], fetchImpl: ClaudeFetch, maxTokens = MAX_TOKENS): Promise<string> {
  let res: { status: number; text(): Promise<string> }
  let body: string
  try {
    res = await withTimeout(fetchImpl(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
        // Required for calls from a browser origin (the plugin iframe); the key stays in the sandbox.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, messages }),
    }), CLAUDE_TIMEOUT_MS)
    body = await res.text()
  } catch {
    throw new ClaudeError('Couldn’t reach Claude (api.anthropic.com). Check your connection and try again.', 0)
  }
  if (res.status < 200 || res.status >= 300) throw failure(res.status, body, config.model)
  try {
    const parsed = JSON.parse(body) as { content?: { type: string; text?: string }[] }
    const text = (parsed.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim()
    if (!text) throw new Error('empty')
    return text
  } catch {
    throw new ClaudeError('Claude sent an empty or unreadable reply. Try asking again.', res.status)
  }
}
