// Shell-side session flow: boot, login, logout, reset. Talks to the sandbox
// session:* handlers and swaps the brand (data-brand + resolved tokens).
import type { RpcClient } from '@shared/bridge'
import { applyTokens, clearTokens, type BrandTokensResult } from '@shared/brand'
import { config, personas, WINDOW_PRESETS, WINDOW_DEFAULT } from '@shared/config'
import { ONBOARDING_MSG, SESSION_MSG, type OnboardingStatus, type Session } from '@shared/session'
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
  screen.value = (await tourPending(client)) ? 'onboarding' : 'app'
}

/** First run after sign-in shows the tour. If the flag can't be read, go straight to the app: the tour is optional. */
async function tourPending(client: RpcClient): Promise<boolean> {
  try {
    const status = await client.call<OnboardingStatus>(ONBOARDING_MSG.status)
    return status.completedAt === null
  } catch {
    return false
  }
}

/**
 * Finish or skip the tour. The app opens first, whatever happens to the save; resolves
 * to whether the flag was stored. A failed save has one consequence — the tour shows
 * again on the next sign-in — so callers may ignore it.
 */
export async function completeOnboarding(client: RpcClient, skipped: boolean): Promise<boolean> {
  screen.value = 'app'
  try {
    await client.call(ONBOARDING_MSG.complete, { skipped })
    return true
  } catch {
    return false
  }
}

/** Settings › "Replay product tour". */
export function replayOnboarding(): void {
  screen.value = 'onboarding'
}

/** `onAccepted` fires once the sandbox accepts the code, before the brand loads (the login card's Success state). */
export async function login(client: RpcClient, code: string, onAccepted?: () => void): Promise<void> {
  const next = await client.call<Session>(SESSION_MSG.login, { code })
  onAccepted?.()
  await enter(client, next)
}

/** No identity provider is wired to the plugin yet, so every SSO attempt explains that instead of pretending. */
export async function loginWithSso(): Promise<void> {
  throw new Error('SSO isn’t set up for this plugin yet. Use the access code from your design-system team instead.')
}

export async function logout(client: RpcClient): Promise<void> {
  await client.call(SESSION_MSG.logout)
  leave()
}

/** Reset = log out and forget every stored preference; the UI returns to first-run state. */
export async function reset(client: RpcClient): Promise<void> {
  await client.call(SESSION_MSG.reset)
  selectPersona(personas.find((p) => p.id === config.activePersona)?.id ?? personas[0]?.id ?? '')
  windowSize.value = WINDOW_PRESETS[WINDOW_DEFAULT]
  void client.call('shell:resize', WINDOW_PRESETS[WINDOW_DEFAULT]).catch(() => undefined)
  leave()
}

function leave(): void {
  clearTokens()
  session.value = null
  brandStatus.value = null
  document.documentElement.dataset.brand = config.brand.active
  screen.value = 'login'
}
