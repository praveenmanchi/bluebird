// Shell-side session flow: boot, login, logout, reset. Talks to the sandbox
// session:* handlers and swaps the brand (data-brand + resolved tokens).
import type { RpcClient } from '@shared/bridge'
import { applyTokens, clearTokens, type BrandTokensResult } from '@shared/brand'
import { config, singleBrand, WINDOW_PRESETS, WINDOW_DEFAULT } from '@shared/config'
import { ONBOARDING_MSG, PERSONA_MSG, SESSION_MSG, type OnboardingStatus, type PersonaStatus, type Session } from '@shared/session'
import { loadLibraryState } from '@shared/libraries/status'
import { loadEditorMode } from '@shared/editor'
import { brandPersonas, brandStatus, changingPersona, replayingTour, screen, session, selectPersona, syncTabs, windowSize } from './state'
import { introState } from './intro/state'

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
  // Dev Mode's read-only file changes what the tabs offer; asked alongside the session.
  void loadEditorMode(client)
  let current: Session | null = null
  try { current = await client.call<Session | null>(SESSION_MSG.status) } catch { current = null }
  // A single-brand build has no login screen to fall back to: an unreadable store still opens its brand.
  const locked = singleBrand(config)
  if (!current && locked) current = { brandId: locked, since: new Date().toISOString() }
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
 * Finish or skip the tour. The next screen opens first, whatever happens to the save; resolves
 * to whether the flag was stored. A failed save has one consequence — the tour shows
 * again on the next sign-in — so callers may ignore it.
 */
export async function completeOnboarding(client: RpcClient, skipped: boolean): Promise<boolean> {
  // First run: the team setup screen follows the tour, finished or skipped. A replay goes back to the app.
  screen.value = replayingTour.value ? 'app' : 'team-setup'
  replayingTour.value = false
  try {
    await client.call(ONBOARDING_MSG.complete, { skipped })
    return true
  } catch {
    return false
  }
}

/** Leaves the team setup screen, with or without a file imported: the Figma API key screen is next. */
export function finishTeamSetup(): void {
  screen.value = 'figma-key'
}

/** Leaves the Figma API key screen (skipped, connected, or a key was already saved). */
export function finishFigmaKey(): void {
  screen.value = 'app'
}

/** Settings › "Replay product tour". */
export function replayOnboarding(): void {
  replayingTour.value = true
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

/**
 * Reset = log out and forget every stored preference; the UI returns to first-run state.
 * A single-brand build has no login to return to, so it boots straight back into its brand.
 */
export async function reset(client: RpcClient): Promise<void> {
  await client.call(SESSION_MSG.reset)
  windowSize.value = WINDOW_PRESETS[WINDOW_DEFAULT]
  void client.call('shell:resize', WINDOW_PRESETS[WINDOW_DEFAULT]).catch(() => undefined)
  leave()
  // Signed out now, so this is the config's first-run persona, not the old brand's.
  selectPersona(brandPersonas.value.find((p) => p.id === config.activePersona)?.id ?? brandPersonas.value[0]?.id ?? '')
  if (singleBrand(config)) await bootSession(client)
}

/** Single-brand builds have nothing to sign out of: Settings hides the button. */
export const canSignOut = (): boolean => singleBrand(config) === null

function leave(): void {
  clearTokens()
  session.value = null
  // Reset wipes the stored intro progress; the next sign-in reads it afresh.
  introState.value = null
  brandStatus.value = null
  document.documentElement.dataset.brand = config.brand.active
  // Single-brand: reset() boots straight back in, so hold on the blank boot screen rather than flash the login.
  screen.value = singleBrand(config) ? 'boot' : 'login'
}
