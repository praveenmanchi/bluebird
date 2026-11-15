import { describe, expect, it } from 'vitest'
import { INTRO_DEFAULT, INTRO_MSG, type IntroState } from '@shared/session'
import type { Handler, HandlerContext, HandlerMap } from '@shared/bridge'
import { createIntroHandlers, INTRO_KEY, normalizeIntro } from './intro'
import type { SessionStore } from './session'

function memoryStore(): SessionStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return { data, get: async (k) => data.get(k), set: async (k, v) => { data.set(k, v) }, delete: async (k) => { data.delete(k) }, keys: async () => [...data.keys()] }
}

describe('normalizeIntro', () => {
  it('falls back field by field and drops junk ids', () => {
    expect(normalizeIntro(null)).toEqual(INTRO_DEFAULT)
    expect(normalizeIntro({ layoutDone: 'yes', seenTabs: ['a', 3, '', 'a', 'b'], knownTabs: 'x', announced: null }))
      .toEqual({ layoutDone: false, seenTabs: ['a', 'b'], knownTabs: null, announced: [] })
  })
  it('keeps an explicit null known list', () => {
    expect(normalizeIntro({ knownTabs: null }, { ...INTRO_DEFAULT, knownTabs: ['a'] }).knownTabs).toBeNull()
  })
})

const call = (h: HandlerMap, type: string, payload?: unknown) => (h[type] as Handler)(payload, {} as HandlerContext) as Promise<IntroState>

describe('intro handlers', () => {
  it('start from the default and merge saves into what is stored', async () => {
    const store = memoryStore()
    const h = createIntroHandlers(store)
    expect(await call(h, INTRO_MSG.status)).toEqual(INTRO_DEFAULT)
    await call(h, INTRO_MSG.save, { layoutDone: true, knownTabs: ['audit', 'varsearch'] })
    const after = await call(h, INTRO_MSG.save, { seenTabs: ['audit'] })
    expect(after).toEqual({ layoutDone: true, seenTabs: ['audit'], knownTabs: ['audit', 'varsearch'], announced: [] })
    expect(store.data.get(INTRO_KEY)).toEqual(after)
    expect(await call(h, INTRO_MSG.status)).toEqual(after)
  })
})
