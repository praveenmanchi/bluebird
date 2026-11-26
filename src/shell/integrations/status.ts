// Whether a Settings section is set up, from its saved values. "Configured" means the
// fields it needs are filled in, not that a connection was tested (Test Connection does that).
import { isProviderConfig, selectProvider } from '@shared/ai'
import { connectedScenarios, type IntegrationId, type IntegrationSettings, type IntegrationValues } from '@shared/integrations'
import { configFromSettings, isConfig } from '@shared/jira/http'

export type SectionStatus = 'configured' | 'missing' | 'off'

type Bag = Readonly<Record<string, unknown>>

/** Every one of these must be filled in. */
const REQUIRED: Partial<Readonly<Record<IntegrationId, readonly string[]>>> = {
  github: ['apiKey', 'repo'],
  storybook: ['baseUrl'],
  zeroheight: ['apiKey', 'styleguideId'],
}

const filled = (values: Bag, key: string) => typeof values[key] === 'string' && (values[key] as string).trim() !== ''

/** `others`: the saved values of the other sections, for a section that borrows one (Storage → GitHub). */
export function sectionStatus(id: IntegrationId, values: IntegrationValues, others?: Partial<IntegrationSettings>): SectionStatus {
  const bag = values as unknown as Bag
  if (bag.enabled === false) return 'off'
  if (id === 'ai') return isProviderConfig(selectProvider(values as IntegrationValues<'ai'>)) ? 'configured' : 'missing'
  if (id === 'storage') {
    if (bag.sameAsGithub !== true) return ['apiKey', 'repo'].every((k) => filled(bag, k)) ? 'configured' : 'missing'
    return others?.github ? sectionStatus('github', others.github) : 'configured'
  }
  if (id === 'dualFile') {
    const files = (values as IntegrationValues<'dualFile'>).files ?? []
    return filled(bag, 'token') && files.some((f) => f.id.trim() !== '') ? 'configured' : 'missing'
  }
  // One connected scenario is enough: each team sets up only the hand-off it works on.
  if (id === 'mcp') return connectedScenarios(values as IntegrationValues<'mcp'>).length > 0 ? 'configured' : 'missing'
  // Cloud needs an email with its API token; Data Center and a sign-in don't.
  if (id === 'jira') return isConfig(configFromSettings(values as IntegrationValues<'jira'>)) ? 'configured' : 'missing'
  if (id === 'notifications') return ['designSystemWebhook', 'devTeamWebhook', 'outlookWebhook', 'emails'].some((k) => filled(bag, k)) ? 'configured' : 'missing'
  return (REQUIRED[id] ?? []).every((k) => filled(bag, k)) ? 'configured' : 'missing'
}
