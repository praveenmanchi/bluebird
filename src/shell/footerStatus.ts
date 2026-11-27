// The footer's status pills, each from real state: Git, UX AI and MCP from their
// Settings sections (they report "configured", not a tested connection: Git and
// MCP call nothing yet, and UX AI's Claude key is tested from Settings), Dual
// File from the shared library state (@shared/libraries/status).
import { signal } from '@preact/signals'
import { describeProvider, isProviderConfig, PROVIDER_LABEL, providerId, selectProvider } from '@shared/ai'
import { MCP_SCENARIO_LABEL, connectedScenarios, mcpTarget, type IntegrationSettings, type IntegrationValues } from '@shared/integrations'
import type { FooterPill } from '@shared/ui'

/** Settings › Integrations as last loaded or saved; null until signed in and read. */
export const integrationSettings = signal<IntegrationSettings | null>(null)

/** Settings › Code repository: where extracted variables are committed. */
export function gitPill(github: IntegrationValues<'github'> | undefined): FooterPill {
  if (!github) return { label: 'Git', status: 'retry', title: 'Reading Settings…' }
  const missing = [...(github.repo.trim() ? [] : ['repository']), ...(github.apiKey.trim() ? [] : ['API key'])]
  if (missing.length) return { label: 'Git', status: 'issue', title: `Add the ${missing.join(' and ')} in Settings › Code repository.` }
  const host = github.baseUrl.trim() ? ` on ${github.baseUrl.trim().replace(/^https?:\/\//, '')}` : ''
  return { label: 'Git', status: 'good', title: `Commits to ${github.repo} (${github.branch})${host}. The key isn’t tested yet.` }
}

export function uxaiPill(ai: IntegrationValues<'ai'> | undefined): FooterPill {
  if (!ai) return { label: 'UXAI', status: 'retry', title: 'Reading Settings…' }
  const config = selectProvider(ai)
  if (!isProviderConfig(config)) {
    if (config.reason === 'disabled') return { label: 'UXAI · off', status: 'issue', title: 'AI Agent Assistance is switched off in Settings.' }
    return { label: 'UXAI', status: 'issue', title: 'Add a Claude, OpenAI or Gemini API key in Settings › AI Agent Assistance.' }
  }
  if (config.fallback) {
    return { label: 'UXAI', status: 'issue', title: `Settings pick ${PROVIDER_LABEL[providerId(ai.provider)]} but it has no key, so ${describeProvider(config)} answers instead. Add the key or change “Answer with” in Settings.` }
  }
  return { label: 'UXAI', status: 'good', title: `Answers with ${describeProvider(config)}. Use Test connection in Settings to check the key.` }
}

/** Settings › MCP + code sync: good once one scenario has its repository and token. */
export function mcpPill(mcp: IntegrationValues<'mcp'> | undefined): FooterPill {
  if (!mcp) return { label: 'MCP', status: 'retry', title: 'Reading Settings…' }
  if (!mcp.enabled) return { label: 'MCP · off', status: 'issue', title: 'MCP + code sync is switched off in Settings, so pushes stay disabled.' }
  const targets = connectedScenarios(mcp).map((scenario) => `${MCP_SCENARIO_LABEL[scenario]}: ${mcpTarget(mcp, scenario).repo}`)
  if (!targets.length) return { label: 'MCP', status: 'issue', title: 'Add a repository and access token for at least one scenario in Settings › MCP + code sync.' }
  return { label: 'MCP', status: 'good', title: `Hand-offs go to ${targets.join(', ')}. Tokens aren’t tested yet.` }
}
