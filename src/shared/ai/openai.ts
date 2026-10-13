// OpenAI Chat Completions. api.openai.com answers CORS with `*`, so the plugin
// calls it directly with the user's own key. `max_completion_tokens` is the
// output cap every current model accepts (reasoning models reject `max_tokens`).
import { AiError, type CompleteOptions, type ProviderAdapter } from './types'

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

function openaiDetail(body: string): string {
  try {
    return String((JSON.parse(body) as { error?: { message?: unknown } }).error?.message ?? '').trim()
  } catch {
    return ''
  }
}

export const openai: ProviderAdapter = {
  provider: 'openai',
  url: () => OPENAI_URL,
  headers: (apiKey) => ({ authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }),
  body: (model, { system, messages, maxTokens, json }: CompleteOptions) => ({
    model,
    max_completion_tokens: maxTokens ?? 1024,
    messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    // JSON mode needs the word "JSON" somewhere in the prompt; the agents' prompts carry it.
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  }),
  text: (parsed) => {
    const reply = parsed as { choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[] }
    const choice = reply.choices?.[0]
    if (choice?.message?.refusal) throw new Error('refusal')
    const text = (choice?.message?.content ?? '').trim()
    if (!text) throw new Error('empty')
    return text
  },
  failure: (status, body, model) => {
    const said = openaiDetail(body)
    switch (status) {
      case 401: return new AiError('OpenAI rejected the API key. Check it in Settings › AI Agent Assistance.', status, 'openai')
      case 403: return new AiError(`This OpenAI key isn’t allowed to do that.${said ? ` OpenAI said: ${said}` : ''}`, status, 'openai')
      case 404: return new AiError(`OpenAI doesn’t know the model “${model}” (or this key can’t use it). Pick another Default Model in Settings.`, status, 'openai')
      case 429: return new AiError(/quota|billing/i.test(said) ? 'This OpenAI key has run out of quota. Check billing on platform.openai.com.' : 'OpenAI is rate-limiting this key. Wait a minute and try again.', status, 'openai')
      case 500: case 502: case 503: return new AiError('OpenAI is having trouble right now. Try again shortly.', status, 'openai')
      default: return new AiError(said ? `OpenAI couldn’t answer: ${said}` : `OpenAI answered ${status}.`, status, 'openai')
    }
  },
}
