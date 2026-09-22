// Access-code session: which brand this Figma user unlocked. Lives in
// figma.clientStorage (per user, per plugin) so it survives plugin reopens.
import type { HandlerMap } from '@shared/bridge'
import type { PluginConfig } from '@shared/config'
import { hashAccessCode, SESSION_MSG, type Session, type SessionLoginRequest, type SessionUpdateRequest } from '@shared/session'

export const SESSION_KEY = 'bluebird:session'

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
 * session:status | login | logout | reset | update — same HandlerMap shape as
 * the other core handlers. `runToken` identifies one plugin run; a session
 * saved with "Keep me signed in" off carries it and is dropped by the next run.
 */
export function createSessionHandlers(config: PluginConfig, store: SessionStore, runToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`): HandlerMap {
  const current = async (): Promise<Session | null> => {
    const v = await store.get(SESSION_KEY)
    if (!isSession(v) || !config.brand.brands[v.brandId]) return null // unknown brand = logged out
    if (v.keepSignedIn === false && v.runToken !== runToken) { await store.delete(SESSION_KEY); return null }
    return v
  }
  const save = async (session: Session): Promise<Session> => {
    const stored: Session = session.keepSignedIn ? { ...session, runToken: undefined } : { ...session, runToken }
    await store.set(SESSION_KEY, stored)
    return stored
  }
  return {
    [SESSION_MSG.status]: current,
    [SESSION_MSG.login]: async (payload: SessionLoginRequest): Promise<Session> => {
      const code = typeof payload?.code === 'string' ? payload.code : ''
      if (!code.trim()) throw new Error('Enter the access code you received from your design-system team.')
      const brandId = brandForCode(config, code)
      if (!brandId) throw new Error('That access code is not recognised.')
      return save({ brandId, since: new Date().toISOString(), keepSignedIn: payload.keepSignedIn ?? true })
    },
    [SESSION_MSG.update]: async (payload: SessionUpdateRequest): Promise<Session> => {
      const session = await current()
      if (!session) throw new Error('Not signed in.')
      return save({ ...session, keepSignedIn: Boolean(payload?.keepSignedIn) })
    },
    [SESSION_MSG.logout]: async () => { await store.delete(SESSION_KEY) },
    // Reset clears everything this plugin stored for the user (session, relay token, future prefs).
    [SESSION_MSG.reset]: async () => { for (const key of await store.keys()) if (key.startsWith('bluebird:')) await store.delete(key) },
  }
}
