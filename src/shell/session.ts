// Shell-side session flow: boot, login, logout, reset. Talks to the sandbox
// session:* handlers and swaps the brand (data-brand + resolved tokens).
import type { RpcClient } from '@shared/bridge'
import { applyTokens, clearTokens, type BrandTokensResult } from '@shared/brand'
import { config, WINDOW_PRESETS, WINDOW_DEFAULT } from '@shared/config'
import { ONBOARDING_MSG, PERSONA_MSG, SESSION_MSG, type OnboardingStatus, type PersonaStatus, type Session } from '@shared/session'
import { loadLibraryState } from '@shared/libraries/status'
import { brandPersonas, brandStatus, changingPersona, screen, session, selectPersona, syncTabs, windowSize } from './state'

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
  syncTabs()
  // A brand can manage Dual File, so its libraries differ per brand: read them for this one.
  void loadLibraryState(client)
  await activateBrand(client, next.brandId)
  if (await restorePersona(client)) await openApp(client)
  else screen.value = 'splash'
}

async function openApp(client: RpcClient): Promise<void> {
  screen.value = (await tourPending(client)) ? 'onboarding' : 'app'
}

/**
 * Applies the stored persona; false means the person still has to pick one. A brand with a single
 * persona has nothing to pick, and an unreadable store opens the app on the default: the picker is optional.
 */
async function restorePersona(client: RpcClient): Promise<boolean> {
  if (brandPersonas.value.length < 2) return true
  try {
    const { personaId } = await client.call<PersonaStatus>(PERSONA_MSG.status)
    if (!personaId || !brandPersonas.value.some((p) => p.id === personaId)) return false
    selectPersona(personaId)
    return true
  } catch {
    return true
  }
}

/**
 * The persona screen's Continue. Resolves to whether the choice was stored; a failed save
 * only means the picker shows again next time, so the app opens either way.
 */
export async function choosePersona(client: RpcClient, personaId: string): Promise<boolean> {
  selectPersona(personaId)
  let saved = true
  try { await client.call(PERSONA_MSG.select, { personaId }) } catch { saved = false }
  // Cleared only as the screen changes: the picker is still up during the save, and would replay its intro.
  if (changingPersona.value) { changingPersona.value = false; screen.value = 'app' }
  else await openApp(client)
  return saved
}

/** Settings › "Change persona". */
export function changePersona(): void {
  changingPersona.value = true
  screen.value = 'persona'
}

export function cancelPersonaChange(): void {
  changingPersona.value = false
  screen.value = 'settings'
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
  windowSize.value = WINDOW_PRESETS[WINDOW_DEFAULT]
  void client.call('shell:resize', WINDOW_PRESETS[WINDOW_DEFAULT]).catch(() => undefined)
  leave()
  // Signed out now, so this is the config's first-run persona, not the old brand's.
  selectPersona(brandPersonas.value.find((p) => p.id === config.activePersona)?.id ?? brandPersonas.value[0]?.id ?? '')
}

function leave(): void {
  clearTokens()
  session.value = null
  brandStatus.value = null
  document.documentElement.dataset.brand = config.brand.active
  screen.value = 'login'
}
