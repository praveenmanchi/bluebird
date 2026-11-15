// Coach-mark intro progress: one clientStorage entry per user. Reset wipes every
// `bluebird:` key, so the layout intro, every tab intro and the New badges come back after it.
import type { HandlerMap } from '@shared/bridge'
import { INTRO_DEFAULT, INTRO_MSG, type IntroState } from '@shared/session'
import type { SessionStore } from './session'

export const INTRO_KEY = 'bluebird:intro'

/** Longest tab list kept; plugin.config.json has a dozen tabs, so this only stops a runaway store. */
const MAX_TABS = 200
const MAX_ID = 64

function ids(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const out = v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= MAX_ID)
  return [...new Set(out)].slice(0, MAX_TABS)
}

/** A stored or sent value, read field by field: anything unreadable keeps the fallback's value. */
export function normalizeIntro(v: unknown, fallback: IntroState = INTRO_DEFAULT): IntroState {
  if (typeof v !== 'object' || v === null) return fallback
  const s = v as Record<string, unknown>
  const knownTabs = s.knownTabs === null ? null : ids(s.knownTabs) ?? fallback.knownTabs
  return {
    layoutDone: typeof s.layoutDone === 'boolean' ? s.layoutDone : fallback.layoutDone,
    seenTabs: ids(s.seenTabs) ?? fallback.seenTabs,
    knownTabs: 'knownTabs' in s ? knownTabs : fallback.knownTabs,
    announced: ids(s.announced) ?? fallback.announced,
  }
}

export function createIntroHandlers(store: SessionStore): HandlerMap {
  return {
    [INTRO_MSG.status]: async (): Promise<IntroState> => normalizeIntro(await store.get(INTRO_KEY)),
    [INTRO_MSG.save]: async (payload: unknown): Promise<IntroState> => {
      const next = normalizeIntro(payload, normalizeIntro(await store.get(INTRO_KEY)))
      await store.set(INTRO_KEY, next)
      return next
    },
  }
}
