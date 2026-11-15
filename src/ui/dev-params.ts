// Browser-only (?mode=mock) knobs set by the dev harness (dev.html). Never read in Figma.
import type { BrandId } from '@shared/brand'
import { BRANDS } from '@shared/brand'
import type { TransportStatus } from '@shared/bridge'

export const SCENARIOS = ['default', 'empty', 'many', 'slow', 'error'] as const
export type Scenario = (typeof SCENARIOS)[number]
export const SCENARIO_LABELS: Record<Scenario, string> = {
  default: 'Sample (3 findings)',
  empty: 'All text passes',
  many: 'Many findings (12)',
  slow: 'Slow scan (3 s)',
  error: 'Scan fails',
}

/** Harness persona value that clears the stored one, so the first-run splash and persona screen show. */
export const ASK_PERSONA = 'ask'

export interface DevParams {
  brand?: BrandId
  scenario: Scenario
  persona?: string
  status: TransportStatus
  /** Pre-unlocked brand; 'none' forces the login screen; absent keeps whatever the (persisted) mock session holds. */
  session?: BrandId | 'none'
  /** true when rendered inside the harness iframe. */
  embed: boolean
  /** `?intros=done` marks every coach-mark intro as seen (e2e flows); absent keeps what the persisted mock holds. */
  introsDone?: boolean
}

export function readDevParams(search = location.search): DevParams {
  const q = new URLSearchParams(search)
  const brand = q.get('brand')
  const scenario = q.get('data')
  const status = q.get('status')
  return {
    brand: BRANDS.includes(brand as BrandId) ? (brand as BrandId) : undefined,
    scenario: SCENARIOS.includes(scenario as Scenario) ? (scenario as Scenario) : 'default',
    persona: q.get('persona') ?? undefined,
    status: status === 'connecting' || status === 'disconnected' ? status : 'connected',
    session: q.get('session') === 'none' ? 'none' : BRANDS.includes(q.get('session') as BrandId) ? (q.get('session') as BrandId) : undefined,
    embed: q.get('embed') === '1',
    introsDone: q.get('intros') === 'done' ? true : undefined,
  }
}
