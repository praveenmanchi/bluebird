// Which repository, branch and folder the team History uses: Settings ›
// Storage, or — with "Use the Code repository" on — the GitHub
// section's repository and token with Storage's own folder.
import { DEFAULT_INTEGRATIONS, validateIntegration, type IntegrationValues } from '@shared/integrations'
import { codeHostConfig, isProblem, type CodeHostConfig } from '@shared/codehost'

export interface HistoryStorage { config: CodeHostConfig; folder: string }
export interface StorageProblem { problem: string }

const LABELS: Record<string, string> = { Repository: 'repository', 'Access token': 'API key', repo: 'repository', apiKey: 'API key', baseUrl: 'base URL', branch: 'branch', folder: 'history folder' }
const listOf = (fields: readonly string[]) => fields.map((f) => LABELS[f] ?? f).join(' and ')

export function resolveStorage(storage: IntegrationValues<'storage'> | undefined, github: IntegrationValues<'github'>): HistoryStorage | StorageProblem {
  const s = storage ?? DEFAULT_INTEGRATIONS.storage
  const folder = s.folder.trim().replace(/\/+$/, '') || DEFAULT_INTEGRATIONS.storage.folder
  const bad = Object.keys(validateIntegration('storage', { ...s, folder }))
  if (s.sameAsGithub) {
    const config = codeHostConfig(github)
    if (isProblem(config)) return { problem: `${config.reason === 'incomplete' ? 'Add' : 'Fix'} the ${listOf(config.fields)} in Settings › Code repository, or turn off “Use the Code repository” in Settings › Storage` }
    if (bad.includes('folder')) return { problem: 'Fix the history folder in Settings › Storage' }
    return { config, folder }
  }
  const missing = [...(s.repo.trim() ? [] : ['repo']), ...(s.apiKey.trim() ? [] : ['apiKey'])]
  if (missing.length) return { problem: `Add the ${listOf(missing)} in Settings › Storage` }
  if (bad.length) return { problem: `Fix the ${listOf(bad)} in Settings › Storage` }
  const config = codeHostConfig({ ...DEFAULT_INTEGRATIONS.github, apiKey: s.apiKey, repo: s.repo, branch: s.branch, baseUrl: s.baseUrl, host: s.host, email: s.email })
  if (isProblem(config)) return { problem: `Fix the ${listOf(config.fields)} in Settings › Storage` }
  return { config, folder }
}

export const isStorageProblem = (x: HistoryStorage | StorageProblem): x is StorageProblem => 'problem' in x
