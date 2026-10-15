import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { ANTHROPIC_URL, GEMINI_API, OPENAI_URL, complete, extractArray, extractJson, isProviderConfig, providerId, selectProvider, type AiFetch } from './index'

const reply = (status: number, body: unknown): AiFetch => async () => ({ status, text: async () => JSON.stringify(body) })
const ai = DEFAULT_INTEGRATIONS.ai
const q = { system: 'sys', messages: [{ role: 'user' as const, content: 'q' }] }

describe('selectProvider', () => {
  it('reads the picked provider, its model and key; falls back to the first provider with a key', () => {
    expect(selectProvider({ ...ai, enabled: false, claudeKey: 'k' })).toEqual({ reason: 'disabled' })
    expect(selectProvider(ai)).toEqual({ reason: 'no-key' })
    expect(selectProvider({ ...ai, claudeKey: ' k ', instructions: ' Say tokens. ' })).toEqual({ provider: 'claude', model: 'claude-opus-5-5', apiKey: 'k', instructions: 'Say tokens.', fallback: false })
    expect(selectProvider({ ...ai, provider: 'Gemini', geminiKey: 'g' })).toMatchObject({ provider: 'gemini', model: 'gemini-3.5-flash', apiKey: 'g', fallback: false })
    expect(selectProvider({ ...ai, provider: 'OpenAI', geminiKey: 'g' })).toMatchObject({ provider: 'gemini', fallback: true })
    expect(providerId('openai')).toBe('openai')
    expect(providerId('nonsense')).toBe('claude')
  })
})

describe('complete', () => {
  it('posts to Anthropic with the key, version and browser header, and joins the text blocks', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = []
    const fetch: AiFetch = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body })
      return { status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: 'surface/accent ' }, { type: 'text', text: 'is the primary.' }] }) }
    }
    expect(await complete({ provider: 'claude', model: 'claude-opus-5-5', apiKey: 'sk-ant-test' }, q, fetch)).toBe('surface/accent is the primary.')
    expect(calls[0]!.url).toBe(ANTHROPIC_URL)
    expect(calls[0]!.headers).toMatchObject({ 'x-api-key': 'sk-ant-test', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' })
    expect(JSON.parse(calls[0]!.body)).toEqual({ model: 'claude-opus-5-5', max_tokens: 1024, system: 'sys', messages: [{ role: 'user', content: 'q' }] })
  })

  it('posts to OpenAI as chat completions with a system message, bearer auth and JSON mode on request', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = []
    const fetch: AiFetch = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body })
      return { status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }) }
    }
    expect(await complete({ provider: 'openai', model: 'gpt-5', apiKey: 'sk-proj' }, { ...q, json: true, maxTokens: 50 }, fetch)).toBe('{"a":1}')
    expect(calls[0]!.url).toBe(OPENAI_URL)
    expect(calls[0]!.headers.authorization).toBe('Bearer sk-proj')
    expect(JSON.parse(calls[0]!.body)).toEqual({
      model: 'gpt-5', max_completion_tokens: 50, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'q' }],
    })
  })

  it('posts to Gemini with the key header, a system instruction and model/user roles', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = []
    const fetch: AiFetch = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body })
      return { status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hi ' }, { text: 'there' }] } }] }) }
    }
    const messages = [{ role: 'user' as const, content: 'a' }, { role: 'assistant' as const, content: 'b' }, { role: 'user' as const, content: 'c' }]
    expect(await complete({ provider: 'gemini', model: 'gemini-2.5-pro', apiKey: 'AIza' }, { system: 'sys', messages, json: true }, fetch)).toBe('Hi there')
    expect(calls[0]!.url).toBe(`${GEMINI_API}/models/gemini-2.5-pro:generateContent`)
    expect(calls[0]!.headers['x-goog-api-key']).toBe('AIza')
    expect(JSON.parse(calls[0]!.body)).toEqual({
      systemInstruction: { parts: [{ text: 'sys' }] },
      contents: [{ role: 'user', parts: [{ text: 'a' }] }, { role: 'model', parts: [{ text: 'b' }] }, { role: 'user', parts: [{ text: 'c' }] }],
      generationConfig: { maxOutputTokens: 1024, responseMimeType: 'application/json' },
    })
  })

  it.each([
    ['claude', 401, 'rejected the Claude API key'],
    ['claude', 404, 'doesn’t know the model “m”'],
    ['claude', 429, 'rate-limiting'],
    ['claude', 529, 'overloaded'],
    ['openai', 401, 'OpenAI rejected the API key'],
    ['openai', 404, 'doesn’t know the model “m”'],
    ['openai', 503, 'having trouble'],
    ['gemini', 404, 'doesn’t know the model “m”'],
    ['gemini', 429, 'rate-limiting'],
  ] as const)('explains a %s %i', async (provider, status, message) => {
    await expect(complete({ provider, model: 'm', apiKey: 'k' }, q, reply(status, { error: { message: 'x' } }))).rejects.toThrow(message)
  })

  it('reads provider-specific key failures and the provider’s own reason', async () => {
    await expect(complete({ provider: 'gemini', model: 'm', apiKey: 'k' }, q, reply(400, { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }))).rejects.toThrow('rejected the Gemini API key')
    await expect(complete({ provider: 'openai', model: 'm', apiKey: 'k' }, q, reply(429, { error: { message: 'You exceeded your current quota, please check your plan and billing' } }))).rejects.toThrow('run out of quota')
    await expect(complete({ provider: 'claude', model: 'm', apiKey: 'k' }, q, reply(400, { error: { message: 'Your credit balance is too low' } }))).rejects.toThrow('credit balance is too low')
  })

  it('reports a network error, an empty reply, a refusal and a non-JSON reply', async () => {
    const c = { provider: 'claude' as const, model: 'm', apiKey: 'k' }
    await expect(complete(c, q, async () => { throw new Error('down') })).rejects.toThrow('Couldn’t reach Claude')
    await expect(complete(c, q, reply(200, { content: [] }))).rejects.toThrow('empty or unreadable')
    await expect(complete(c, q, reply(200, { content: [], stop_reason: 'refusal' }))).rejects.toThrow('declined')
    await expect(complete({ ...c, provider: 'openai' }, q, reply(200, { choices: [{ message: { content: null, refusal: 'no' } }] }))).rejects.toThrow('declined')
    await expect(complete({ ...c, provider: 'gemini' }, q, reply(200, { promptFeedback: { blockReason: 'SAFETY' } }))).rejects.toThrow('declined')
    await expect(complete(c, q, async () => ({ status: 200, text: async () => '<html>' }))).rejects.toThrow('isn’t JSON')
  })

  it('is a type guard', () => {
    expect(isProviderConfig({ reason: 'no-key' })).toBe(false)
  })
})

describe('extractJson', () => {
  it('reads bare JSON, fenced JSON and JSON inside prose; null when there is none', () => {
    expect(extractJson('[1,2]')).toEqual([1, 2])
    expect(extractJson('Here you go:\n```json\n{"a":[1]}\n```\nDone.')).toEqual({ a: [1] })
    expect(extractJson('Sure! {"a":1} hope that helps')).toEqual({ a: 1 })
    expect(extractJson('nothing here')).toBeNull()
  })

  it('finds the array however the model wrapped it', () => {
    expect(extractArray('{"findings":[{"id":1},{"id":2}]}')).toEqual([{ id: 1 }, { id: 2 }])
    expect(extractArray('[{"id":1}, 3, null]')).toEqual([{ id: 1 }])
    expect(extractArray('{"id":1}')).toEqual([{ id: 1 }])
    expect(extractArray('no json')).toEqual([])
  })
})
