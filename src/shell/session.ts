// Shell-side session flow: boot, login, logout, reset. Talks to the sandbox
// session:* handlers and swaps the brand (data-brand + resolved tokens).
import type { RpcClient } from '@shared/bridge'
import { applyTokens, clearTokens, type BrandTokensResult } from '@shared/brand'
import { config, personas, WINDOW_PRESETS } from '@shared/config'
import { SESSION_MSG, type Session } from '@shared/session'
import { brandStatus, screen, session, selectPersona, windowSize } from './state'

/** Point the UI at a brand: generated [data-brand] CSS first, then the tokens resolved from the Figma document. */
export async function activateBrand(client: RpcClient, brandId: string): Promise<void> {
  clearTokens()
  document.documentElement.dataset.brand = brandId
  try {
    const result = await client.call<BrandTokensResult>('brand:tokens', { brandId })
    brandStatus.value = result
    applyTokens(result.tokens)
  } catch (error: unknown) {
    brandStatus.value = { brandId, source: 'fallback', tokens: {}, note: `Brand tokens unavailable: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}

export async function bootSession(client: RpcClient): Promise<void> {
  let current: Session | null = null
  try { current = await client.call<Session | null>(SESSION_MSG.status) } catch { current = null }
  if (current) await enter(client, current)
  else { session.value = null; document.documentElement.dataset.brand = config.brand.active; screen.value = 'login' }
}

async function enter(client: RpcClient, next: Session): Promise<void> {
  session.value = next
  await activateBrand(client, next.brandId)
  screen.value = 'app'
}

export async function login(client: RpcClient, code: string): Promise<void> {
  const next = await client.call<Session>(SESSION_MSG.login, { code })
  await enter(client, next)
}

export async function logout(client: RpcClient): Promise<void> {
  await client.call(SESSION_MSG.logout)
  leave()
}

/** Reset = log out and forget every stored preference; the UI returns to first-run state. */
export async function reset(client: RpcClient): Promise<void> {
  await client.call(SESSION_MSG.reset)
  selectPersona(personas.find((p) => p.id === config.activePersona)?.id ?? personas[0]?.id ?? '')
  windowSize.value = WINDOW_PRESETS.S
  void client.call('shell:resize', WINDOW_PRESETS.S).catch(() => undefined)
  leave()
}

function leave(): void {
  clearTokens()
  session.value = null
  brandStatus.value = null
  document.documentElement.dataset.brand = config.brand.active
  screen.value = 'login'
}
