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

export interface DevParams {
  brand?: BrandId
  scenario: Scenario
  persona?: string
  status: TransportStatus
  /** true when rendered inside the harness iframe. */
  embed: boolean
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
    embed: q.get('embed') === '1',
  }
}
