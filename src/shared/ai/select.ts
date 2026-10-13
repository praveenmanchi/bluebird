// Which provider answers: the one Settings › AI Agent Assistance names, with
// its model and key; when that one has no key, the first provider that does.
import type { IntegrationValues } from '@shared/integrations'
import { PROVIDER_LABEL, PROVIDERS, type Provider, type ProviderConfig } from './types'

export type NotConfigured = { reason: 'disabled' | 'no-key' }

const KEY: Record<Provider, 'claudeKey' | 'openaiKey' | 'geminiKey'> = { claude: 'claudeKey', openai: 'openaiKey', gemini: 'geminiKey' }
const MODEL: Record<Provider, 'claudeModel' | 'openaiModel' | 'geminiModel'> = { claude: 'claudeModel', openai: 'openaiModel', gemini: 'geminiModel' }

/** "Claude" / "claude" / "OpenAI" → the provider id; anything else → Claude (the default and the first provider). */
export function providerId(value: string): Provider {
  const lower = value.trim().toLowerCase()
  return PROVIDERS.find((p) => p === lower || PROVIDER_LABEL[p].toLowerCase() === lower) ?? 'claude'
}

/** The providers Settings hold a key for, in Settings order. */
export function providersWithKeys(ai: IntegrationValues<'ai'>): Provider[] {
  return PROVIDERS.filter((p) => ai[KEY[p]].trim() !== '')
}

export function selectProvider(ai: IntegrationValues<'ai'>): ProviderConfig | NotConfigured {
  if (!ai.enabled) return { reason: 'disabled' }
  const wanted = providerId(ai.provider)
  const withKeys = providersWithKeys(ai)
  const provider = withKeys.includes(wanted) ? wanted : withKeys[0]
  if (!provider) return { reason: 'no-key' }
  return { provider, model: ai[MODEL[provider]].trim(), apiKey: ai[KEY[provider]].trim(), instructions: ai.instructions.trim(), fallback: provider !== wanted }
}

export const isProviderConfig = (c: ProviderConfig | NotConfigured): c is ProviderConfig => 'apiKey' in c

/** "Claude (claude-opus-5-5)" for status lines. */
export const describeProvider = (c: Pick<ProviderConfig, 'provider' | 'model'>): string => `${PROVIDER_LABEL[c.provider]} (${c.model})`
