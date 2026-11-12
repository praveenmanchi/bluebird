import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { isStorageProblem, resolveStorage } from './config'

const github = { ...DEFAULT_INTEGRATIONS.github, repo: 'acme/tokens', apiKey: 'ghp_tokens', branch: 'develop' }
const storage = DEFAULT_INTEGRATIONS.storage

describe('history storage', () => {
  it('borrows the GitHub repository by default, with its own folder', () => {
    const r = resolveStorage(storage, github)
    expect(isStorageProblem(r)).toBe(false)
    if (!isStorageProblem(r)) expect([r.config.repo, r.config.token, r.config.branch, r.folder]).toEqual(['acme/tokens', 'ghp_tokens', 'develop', '.bluebird/history'])
  })

  it('uses its own repository and key when “same as GitHub” is off', () => {
    const r = resolveStorage({ ...storage, sameAsGithub: false, repo: 'acme/history', apiKey: 'ghp_history', branch: 'main', folder: 'log/' }, github)
    if (isStorageProblem(r)) throw new Error(r.problem)
    expect([r.config.repo, r.config.token, r.config.branch, r.folder]).toEqual(['acme/history', 'ghp_history', 'main', 'log'])
  })

  it('says which section to fix', () => {
    expect(resolveStorage(storage, DEFAULT_INTEGRATIONS.github)).toEqual({ problem: expect.stringMatching(/Settings › GitHub, or turn off/) })
    expect(resolveStorage({ ...storage, sameAsGithub: false }, github)).toEqual({ problem: 'Add the repository and API key in Settings › Storage' })
    expect(resolveStorage({ ...storage, folder: '../escape' }, github)).toEqual({ problem: 'Fix the history folder in Settings › Storage' })
    expect(resolveStorage({ ...storage, sameAsGithub: false, repo: 'acme/history', apiKey: 'k', baseUrl: 'http://evil.example' }, github)).toEqual({ problem: 'Fix the base URL in Settings › Storage' })
  })

  it('falls back to the defaults for settings saved before Storage existed', () => {
    expect(isStorageProblem(resolveStorage(undefined, github))).toBe(false)
  })
})
