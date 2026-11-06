// Whether a Settings section is set up, from its saved values. "Configured" means the
// fields it needs are filled in, not that a connection was tested (Test Connection does that).
import { isProviderConfig, selectProvider } from '@shared/ai'
import type { IntegrationId, IntegrationValues } from '@shared/integrations'

export type SectionStatus = 'configured' | 'missing' | 'off'

type Bag = Readonly<Record<string, unknown>>

/** Every one of these must be filled in. */
const REQUIRED: Partial<Readonly<Record<IntegrationId, readonly string[]>>> = {
  github: ['apiKey', 'repo'],
  storybook: ['baseUrl'],
  zeroheight: ['apiKey', 'styleguideId'],
  dualFile: ['file1Id', 'file1Key'],
  mcp: ['repo', 'token'],
  jira: ['projectKey', 'apiKey', 'email', 'siteUrl'],
}

const filled = (values: Bag, key: string) => typeof values[key] === 'string' && (values[key] as string).trim() !== ''

export function sectionStatus(id: IntegrationId, values: IntegrationValues): SectionStatus {
  const bag = values as unknown as Bag
  if (bag.enabled === false) return 'off'
  if (id === 'ai') return isProviderConfig(selectProvider(values as IntegrationValues<'ai'>)) ? 'configured' : 'missing'
  if (id === 'notifications') return ['designSystemWebhook', 'devTeamWebhook', 'emails'].some((k) => filled(bag, k)) ? 'configured' : 'missing'
  return (REQUIRED[id] ?? []).every((k) => filled(bag, k)) ? 'configured' : 'missing'
}
