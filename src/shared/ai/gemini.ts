// Google Gemini generateContent. generativelanguage.googleapis.com answers CORS
// for browser callers; the key travels in the x-goog-api-key header, never the URL.
import { AiError, type CompleteOptions, type ProviderAdapter } from './types'

export const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta'

function geminiDetail(body: string): { message: string; status: string } {
  try {
    const err = (JSON.parse(body) as { error?: { message?: unknown; status?: unknown } }).error
    return { message: String(err?.message ?? '').trim(), status: String(err?.status ?? '') }
  } catch {
    return { message: '', status: '' }
  }
}

export const gemini: ProviderAdapter = {
  provider: 'gemini',
  url: (model) => `${GEMINI_API}/models/${encodeURIComponent(model)}:generateContent`,
  headers: (apiKey) => ({ 'x-goog-api-key': apiKey, 'content-type': 'application/json' }),
  body: (_model, { system, messages, maxTokens, json }: CompleteOptions) => ({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: maxTokens ?? 1024, ...(json ? { responseMimeType: 'application/json' } : {}) },
  }),
  text: (parsed) => {
    const reply = parsed as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } }
    if (reply.promptFeedback?.blockReason) throw new Error('refusal')
    const candidate = reply.candidates?.[0]
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') throw new Error('refusal')
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim()
    if (!text) throw new Error('empty')
    return text
  },
  failure: (status, body, model) => {
    const { message, status: code } = geminiDetail(body)
    if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(`${message} ${code}`)) {
      return new AiError('Google rejected the Gemini API key. Check it in Settings › AI Agent Assistance.', status, 'gemini', 'key')
    }
    switch (status) {
      case 401: case 403: return new AiError(`This Gemini key isn’t allowed to do that.${message ? ` Google said: ${message}` : ''}`, status, 'gemini')
      case 404: return new AiError(`Google doesn’t know the model “${model}”. Pick another Default Model in Settings.`, status, 'gemini')
      case 429: return new AiError('Gemini is rate-limiting this key (or its free quota is used up). Wait a minute and try again.', status, 'gemini')
      case 500: case 503: return new AiError('Gemini is having trouble right now. Try again shortly.', status, 'gemini')
      default: return new AiError(message ? `Gemini couldn’t answer: ${message}` : `Gemini answered ${status}.`, status, 'gemini')
    }
  },
}
