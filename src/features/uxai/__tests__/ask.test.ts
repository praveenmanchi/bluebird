import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { AiFetch } from '@shared/ai'
import { createAskHandlers } from '../sandbox/ask'
import { MSG, type AskResult } from '../messages'
import { buildMessages, libraryContext, systemPrompt } from '../prompt'
import { MOCK_SELECTION, SAMPLE_LIBRARY } from '../fixtures'
import { checkSelection } from '../grounding'

const reply = (status: number, body: unknown): AiFetch => async () => ({ status, text: async () => JSON.stringify(body) })

describe('prompt', () => {
  it('keeps the model to the library context and adds the team’s instructions', () => {
    expect(systemPrompt('')).toContain('Answer only from the library context')
    expect(systemPrompt('Call them tokens.')).toContain('Call them tokens.')
  })

  it('builds the context from the files, the matches and the selection', () => {
    const report = checkSelection(MOCK_SELECTION, SAMPLE_LIBRARY)
    const context = libraryContext('What variables are used in this?', 'selection', SAMPLE_LIBRARY, report)
    expect(context).toContain('- File 1 “Brand UI” (variables): 4 variables in Brand UI, 0 published components')
    expect(context).toContain('Selected layer: Ticket Row')
    expect(context).toContain('- variable jira/text/key (fills; 2 layer(s)) from Brand UI (matched by name)')
    expect(libraryContext('primary colour', 'color', SAMPLE_LIBRARY)).toContain('- surface/accent [COLOR, Brand UI] Bridge #0C8CE9 (→ blue/500) · Ikea #161616 — Primary actions and selection')
  })

  it('sends the last few turns, then the question with its context', () => {
    const history = Array.from({ length: 6 }, (_, i) => ({ prompt: `q${i}`, answer: `a${i}` }))
    const messages = buildMessages(history, 'now?', 'CTX')
    expect(messages).toHaveLength(9)
    expect(messages[0]).toEqual({ role: 'user', content: 'q2' })
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'CTX\n\nQuestion: now?' })
  })
})

describe('ask handlers', () => {
  const ctx = {} as never
  const claudeOk = reply(200, { content: [{ type: 'text', text: 'OK' }] })
  const handlers = (ai = { ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'sk-ant-test' }, fetch: AiFetch = claudeOk) =>
    createAskHandlers({ readSettings: async () => ai, fetch })
  const ask = (h: ReturnType<typeof handlers>) => h[MSG.ask]!({ messages: [{ role: 'user', content: 'q' }] } as never, ctx) as Promise<AskResult>

  it('answers with the picked provider, or says why none was asked', async () => {
    expect(await ask(handlers())).toEqual({ status: 'answered', text: 'OK', model: 'claude-opus-5-5', provider: 'claude' })
    expect(await ask(handlers(DEFAULT_INTEGRATIONS.ai))).toEqual({ status: 'not-configured', reason: 'no-key' })
    await expect(handlers()[MSG.ask]!({ messages: [] } as never, ctx)).rejects.toThrow()
  })

  it('routes to OpenAI or Gemini when Settings pick them', async () => {
    const urls: string[] = []
    const fetch: AiFetch = async (url) => {
      urls.push(url)
      return { status: 200, text: async () => JSON.stringify(url.includes('openai') ? { choices: [{ message: { content: 'From OpenAI' } }] } : { candidates: [{ content: { parts: [{ text: 'From Gemini' }] } }] }) }
    }
    expect(await ask(handlers({ ...DEFAULT_INTEGRATIONS.ai, provider: 'OpenAI', openaiKey: 'sk-proj' }, fetch))).toMatchObject({ text: 'From OpenAI', provider: 'openai', model: 'gpt-5.5' })
    expect(await ask(handlers({ ...DEFAULT_INTEGRATIONS.ai, provider: 'Gemini', geminiKey: 'AIza' }, fetch))).toMatchObject({ text: 'From Gemini', provider: 'gemini' })
    expect(urls[0]).toContain('api.openai.com')
    expect(urls[1]).toContain('generativelanguage.googleapis.com')
  })

  it('tests the form’s key for the picked provider on ai:test, and explains a fallback', async () => {
    const test = (values: object) => handlers()['ai:test']!({ ...DEFAULT_INTEGRATIONS.ai, ...values } as never, ctx) as Promise<{ message: string }>
    expect((await test({ claudeKey: 'sk-ant-test' })).message).toBe('Claude (claude-opus-5-5) answered.')
    expect((await test({ provider: 'OpenAI', claudeKey: 'sk-ant-test' })).message).toContain('“Answer with” names OpenAI, which has no key, so Claude is used instead.')
    await expect(test({})).rejects.toThrow('Add an API key for the provider under “Answer with”')
  })
})
