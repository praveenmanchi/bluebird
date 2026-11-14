// Access-code session: which brand this Figma user unlocked. Lives in
// figma.clientStorage (per user, per plugin) so it survives plugin reopens.
import type { HandlerMap } from '@shared/bridge'
import { singleBrand, type PluginConfig } from '@shared/config'
import { hashAccessCode, SESSION_KEY, SESSION_MSG, type Session, type SessionLoginRequest } from '@shared/session'

export { SESSION_KEY }

export interface SessionStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

export function clientStorageStore(): SessionStore {
  return {
    get: (k) => figma.clientStorage.getAsync(k),
    set: (k, v) => figma.clientStorage.setAsync(k, v),
    delete: (k) => figma.clientStorage.deleteAsync(k),
    keys: () => figma.clientStorage.keysAsync(),
  }
}

export function brandForCode(config: PluginConfig, code: string): string | null {
  const hash = hashAccessCode(code)
  for (const [brandId, b] of Object.entries(config.brand.brands)) if (b.accessCodeHash === hash) return brandId
  return null
}

function isSession(v: unknown): v is Session {
  return typeof v === 'object' && v !== null && typeof (v as Session).brandId === 'string'
}

/**
 * session:status | login | logout | reset — same HandlerMap shape as the other
 * core handlers. A session persists across plugin runs until logout or reset.
 * A single-brand build has no sign-in: see singleBrandHandlers.
 */
export function createSessionHandlers(config: PluginConfig, store: SessionStore): HandlerMap {
  const locked = singleBrand(config)
  if (locked) return singleBrandHandlers(locked, store)
  const current = async (): Promise<Session | null> => {
    const v = await store.get(SESSION_KEY)
    return isSession(v) && config.brand.brands[v.brandId] ? v : null // unknown brand = logged out
  }
  return {
    [SESSION_MSG.status]: current,
    [SESSION_MSG.login]: async (payload: SessionLoginRequest): Promise<Session> => {
      const code = typeof payload?.code === 'string' ? payload.code : ''
      if (!code.trim()) throw new Error('Enter the access code you received from your design-system team.')
      const brandId = brandForCode(config, code)
      if (!brandId) throw new Error('That access code is not recognised.')
      const session: Session = { brandId, since: new Date().toISOString() }
      await store.set(SESSION_KEY, session)
      return session
    },
    [SESSION_MSG.logout]: async () => { await store.delete(SESSION_KEY) },
    [SESSION_MSG.reset]: () => resetAll(store),
  }
}

/** Reset clears everything this plugin stored for the user (session, relay token, prefs). */
async function resetAll(store: SessionStore): Promise<void> {
  for (const key of await store.keys()) if (key.startsWith('bluebird:')) await store.delete(key)
}

/**
 * Published inside one client's Figma organisation, so everyone who can run it is in that brand:
 * status always answers with that brand and stores the first-run date so "since" stays put.
 * There is nothing to sign in to or out of; reset still forgets every preference.
 */
function singleBrandHandlers(brandId: string, store: SessionStore): HandlerMap {
  const current = async (): Promise<Session> => {
    const v = await store.get(SESSION_KEY)
    if (isSession(v) && v.brandId === brandId) return v
    const session: Session = { brandId, since: new Date().toISOString() }
    await store.set(SESSION_KEY, session)
    return session
  }
  return {
    [SESSION_MSG.status]: current,
    [SESSION_MSG.login]: current,
    [SESSION_MSG.logout]: async () => undefined,
    [SESSION_MSG.reset]: () => resetAll(store),
  }
}
