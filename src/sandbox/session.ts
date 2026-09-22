// Access-code session: which brand this Figma user unlocked. Lives in
// figma.clientStorage (per user, per plugin) so it survives plugin reopens.
import type { HandlerMap } from '@shared/bridge'
import type { PluginConfig } from '@shared/config'
import { hashAccessCode, SESSION_MSG, type Session, type SessionLoginRequest } from '@shared/session'

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

/** session:status | login | logout | reset — same HandlerMap shape as the other core handlers. */
export function createSessionHandlers(config: PluginConfig, store: SessionStore): HandlerMap {
  const status = async (): Promise<Session | null> => {
    const v = await store.get(SESSION_KEY)
    // A session for a brand that no longer exists in the config is treated as logged out.
    return isSession(v) && config.brand.brands[v.brandId] ? v : null
  }
  return {
    [SESSION_MSG.status]: status,
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
    // Reset clears everything this plugin stored for the user (session, relay token, future prefs).
    [SESSION_MSG.reset]: async () => { for (const key of await store.keys()) if (key.startsWith('bluebird:')) await store.delete(key) },
  }
}
