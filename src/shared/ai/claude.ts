// Anthropic Messages API. api.anthropic.com answers CORS for browser callers that
// send the direct-browser-access header, which is what a plugin iframe is.
import { AiError, type CompleteOptions, type ProviderAdapter } from './types'

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'

/** Anthropic's own explanation from an error body ({ error: { message } }). */
export function anthropicDetail(body: string): string {
  try {
    return String((JSON.parse(body) as { error?: { message?: unknown } }).error?.message ?? '').trim()
  } catch {
    return ''
  }
}

export const claude: ProviderAdapter = {
  provider: 'claude',
  url: () => ANTHROPIC_URL,
  headers: (apiKey) => ({
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json',
    // Required for calls from a browser origin (the plugin iframe); the key stays in the sandbox.
    'anthropic-dangerous-direct-browser-access': 'true',
  }),
  body: (model, { system, messages, maxTokens }: CompleteOptions) => ({
    model,
    max_tokens: maxTokens ?? 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  }),
  text: (parsed) => {
    const reply = parsed as { content?: { type: string; text?: string }[]; stop_reason?: string }
    if (reply.stop_reason === 'refusal') throw new Error('refusal')
    const text = (reply.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim()
    if (!text) throw new Error('empty')
    return text
  },
  failure: (status, body, model) => {
    const said = anthropicDetail(body)
    switch (status) {
      case 401: return new AiError('Anthropic rejected the Claude API key. Check it in Settings › AI Agent Assistance.', status, 'claude')
      case 403: return new AiError(`This Claude API key isn’t allowed to do that.${said ? ` Anthropic said: ${said}` : ''}`, status, 'claude')
      case 404: return new AiError(`Anthropic doesn’t know the model “${model}”. Pick another Default Model in Settings.`, status, 'claude')
      case 429: return new AiError('Claude is rate-limiting this key. Wait a minute and try again.', status, 'claude')
      case 529: return new AiError('Claude is overloaded right now. Try again shortly.', status, 'claude')
      default: return new AiError(said ? `Claude couldn’t answer: ${said}` : `Claude answered ${status}.`, status, 'claude')
    }
  },
}
