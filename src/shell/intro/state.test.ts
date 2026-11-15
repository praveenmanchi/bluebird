import { describe, expect, it, vi } from 'vitest'
import { INTRO_DEFAULT, INTRO_MSG, type IntroState } from '@shared/session'
import type { RpcClient } from '@shared/bridge'
import { firstRunPatch, introState, loadIntro, markAnnounced, markOpened, markTabSeen, newTabsOf, nextIntro, releasedTabs, saveIntro } from './state'

const ALL = ['audit', 'varsearch', 'publish', 'documentation']
const known = (over: Partial<IntroState> = {}): IntroState => ({ layoutDone: true, seenTabs: [], knownTabs: ALL, announced: [], ...over })

describe('nextIntro', () => {
  it('shows the layout intro first', () => {
    expect(nextIntro({ ...INTRO_DEFAULT, knownTabs: ALL }, ALL, 'audit')).toEqual({ kind: 'layout' })
  })
  it('then the open tab’s intro, once', () => {
    expect(nextIntro(known(), ALL, 'audit')).toEqual({ kind: 'tab', tabId: 'audit', replay: false })
    expect(nextIntro(known({ seenTabs: ['audit'] }), ALL, 'audit')).toBeNull()
  })
  it('announces tabs added since the last open before any tab intro', () => {
    const state = known({ knownTabs: ['audit', 'varsearch'] })
    expect(nextIntro(state, ALL, 'audit')).toEqual({ kind: 'whatsnew', tabs: ['publish', 'documentation'] })
    expect(nextIntro({ ...state, announced: ['publish', 'documentation'] }, ALL, 'audit')).toEqual({ kind: 'tab', tabId: 'audit', replay: false })
  })
  it('ignores an active tab the persona can’t see', () => {
    expect(nextIntro(known(), ['varsearch'], 'audit')).toBeNull()
  })
})

describe('new tabs', () => {
  it('are the visible tabs missing from the known list, none before the first run', () => {
    expect(newTabsOf(known({ knownTabs: ['audit'] }), ALL)).toEqual(['varsearch', 'publish', 'documentation'])
    expect(newTabsOf({ ...INTRO_DEFAULT }, ALL)).toEqual([])
    expect(newTabsOf(null, ALL)).toEqual([])
  })
  it('first run records every released tab, whatever the persona', () => {
    expect(firstRunPatch(INTRO_DEFAULT, ALL)).toEqual({ knownTabs: ALL })
    expect(firstRunPatch(known(), ALL)).toBeNull()
    expect(releasedTabs({ a: { enabled: true }, b: { enabled: false }, c: { enabled: true } })).toEqual(['a', 'c'])
  })
  it('opening a new tab clears its badge; known tabs change nothing', () => {
    expect(markOpened(known({ knownTabs: ['audit'] }), 'publish')).toEqual({ knownTabs: ['audit', 'publish'] })
    expect(markOpened(known(), 'audit')).toBeNull()
  })
  it('marks seen and announced without duplicates', () => {
    expect(markTabSeen(known({ seenTabs: ['audit'] }), 'audit')).toEqual({ seenTabs: ['audit'] })
    expect(markAnnounced(known({ announced: ['publish'] }), ['publish', 'documentation'])).toEqual({ announced: ['publish', 'documentation'] })
  })
})

describe('load and save', () => {
  it('reads the stored state, and treats an unreadable store as done', async () => {
    const ok = { call: vi.fn(async () => known()) } as unknown as RpcClient
    expect(await loadIntro(ok)).toEqual(known())
    const broken = { call: vi.fn(async () => { throw new Error('nope') }) } as unknown as RpcClient
    expect((await loadIntro(broken)).layoutDone).toBe(true)
  })
  it('saves optimistically and sends only the patch', () => {
    introState.value = known()
    const call = vi.fn(async () => undefined)
    saveIntro({ call } as unknown as RpcClient, { seenTabs: ['audit'] })
    expect(introState.value?.seenTabs).toEqual(['audit'])
    expect(call).toHaveBeenCalledWith(INTRO_MSG.save, { seenTabs: ['audit'] })
  })
})
