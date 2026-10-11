import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { ANTHROPIC_URL, askClaude, claudeConfig, type ClaudeFetch } from '../claude'
import { createAskHandlers } from '../sandbox/ask'
import { MSG, type AskResult } from '../messages'
import { buildMessages, libraryContext, systemPrompt } from '../prompt'
import { MOCK_SELECTION, SAMPLE_LIBRARY } from '../fixtures'
import { checkSelection } from '../grounding'

const config = { apiKey: 'sk-ant-test', model: 'claude-opus-4-5', instructions: '' }
const reply = (status: number, body: unknown): ClaudeFetch => async () => ({ status, text: async () => JSON.stringify(body) })

describe('askClaude', () => {
  it('posts to the Messages API with the key, version and browser header, and joins the text blocks', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = []
    const fetch: ClaudeFetch = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body })
      return { status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: 'surface/accent ' }, { type: 'text', text: 'is the primary.' }] }) }
    }
    expect(await askClaude(config, 'sys', [{ role: 'user', content: 'q' }], fetch)).toBe('surface/accent is the primary.')
    expect(calls[0]!.url).toBe(ANTHROPIC_URL)
    expect(calls[0]!.headers).toMatchObject({ 'x-api-key': 'sk-ant-test', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' })
    expect(JSON.parse(calls[0]!.body)).toEqual({ model: 'claude-opus-4-5', max_tokens: 1024, system: 'sys', messages: [{ role: 'user', content: 'q' }] })
  })

  it.each([
    [401, 'rejected the Claude API key'],
    [404, 'doesn’t know the model “claude-opus-4-5”'],
    [429, 'rate-limiting'],
    [529, 'overloaded'],
  ])('explains a %i', async (status, message) => {
    await expect(askClaude(config, 's', [{ role: 'user', content: 'q' }], reply(status, { type: 'error', error: { message: 'x' } }))).rejects.toThrow(message)
  })

  it('passes on Anthropic’s reason for other failures, and reports a network error or empty reply', async () => {
    await expect(askClaude(config, 's', [{ role: 'user', content: 'q' }], reply(400, { error: { message: 'Your credit balance is too low' } }))).rejects.toThrow('credit balance is too low')
    await expect(askClaude(config, 's', [{ role: 'user', content: 'q' }], async () => { throw new Error('down') })).rejects.toThrow('Couldn’t reach Claude')
    await expect(askClaude(config, 's', [{ role: 'user', content: 'q' }], reply(200, { content: [] }))).rejects.toThrow('empty or unreadable')
  })

  it('reads the Claude connection from Settings', () => {
    expect(claudeConfig({ ...DEFAULT_INTEGRATIONS.ai, enabled: false, claudeKey: 'k' })).toEqual({ reason: 'disabled' })
    expect(claudeConfig(DEFAULT_INTEGRATIONS.ai)).toEqual({ reason: 'no-key' })
    expect(claudeConfig({ ...DEFAULT_INTEGRATIONS.ai, claudeKey: ' k ', instructions: 'Say tokens.' })).toEqual({ apiKey: 'k', model: 'claude-opus-4-5', instructions: 'Say tokens.' })
  })
})

describe('prompt', () => {
  it('keeps Claude to the library context and adds the team’s instructions', () => {
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
  const handlers = (ai = { ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'sk-ant-test' }, fetch: ClaudeFetch = reply(200, { content: [{ type: 'text', text: 'OK' }] })) =>
    createAskHandlers({ readSettings: async () => ai, fetch })

  it('answers with Claude, or says why it wasn’t asked', async () => {
    const ask = (h: ReturnType<typeof handlers>) => h[MSG.ask]!({ messages: [{ role: 'user', content: 'q' }] } as never, ctx) as Promise<AskResult>
    expect(await ask(handlers())).toEqual({ status: 'answered', text: 'OK', model: 'claude-opus-4-5' })
    expect(await ask(handlers(DEFAULT_INTEGRATIONS.ai))).toEqual({ status: 'not-configured', reason: 'no-key' })
    await expect(handlers()[MSG.ask]!({ messages: [] } as never, ctx)).rejects.toThrow()
  })

  it('tests the form’s Claude key on ai:test, and says plainly that only Claude is wired', async () => {
    const test = (values: object) => handlers()['ai:test']!({ ...DEFAULT_INTEGRATIONS.ai, ...values } as never, ctx) as Promise<{ message: string }>
    expect((await test({ claudeKey: 'sk-ant-test' })).message).toBe('Claude answered with claude-opus-4-5.')
    await expect(test({ openaiKey: 'sk-proj' })).rejects.toThrow('Only Claude is wired up so far')
    await expect(test({})).rejects.toThrow('Add a Claude API key')
  })
})
