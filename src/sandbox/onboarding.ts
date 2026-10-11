// First-run product tour flag: one clientStorage entry per user. Reset wipes every
// `bluebird:` key, so the tour comes back after "Reset all Settings".
import type { HandlerMap } from '@shared/bridge'
import { ONBOARDING_MSG, type OnboardingStatus } from '@shared/session'
import type { SessionStore } from './session'

export const ONBOARDING_KEY = 'bluebird:onboarding'

const NOT_DONE: OnboardingStatus = { completedAt: null, skipped: false }

function isStatus(v: unknown): v is OnboardingStatus {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return typeof s.completedAt === 'string' && !Number.isNaN(Date.parse(s.completedAt)) && typeof s.skipped === 'boolean'
}

export function createOnboardingHandlers(store: SessionStore, now: () => Date = () => new Date()): HandlerMap {
  return {
    [ONBOARDING_MSG.status]: async (): Promise<OnboardingStatus> => {
      const stored = await store.get(ONBOARDING_KEY)
      return isStatus(stored) ? stored : NOT_DONE
    },
    [ONBOARDING_MSG.complete]: async (payload: unknown): Promise<OnboardingStatus> => {
      const skipped = typeof payload === 'object' && payload !== null && (payload as { skipped?: unknown }).skipped === true
      const status: OnboardingStatus = { completedAt: now().toISOString(), skipped }
      await store.set(ONBOARDING_KEY, status)
      return status
    },
  }
}
