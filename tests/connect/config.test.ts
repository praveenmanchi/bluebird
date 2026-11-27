// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { describeProviders, jiraRelayFromEnv, providersFromEnv } from '../../tools/connect/config'

const URL = 'http://localhost:8788'
const FAKE = { CONNECT_FAKE_PROVIDER: '1', CONNECT_ENV: 'staging' }
const GITHUB = { GITHUB_APP_CLIENT_ID: 'Iv23li', GITHUB_APP_CLIENT_SECRET: 'secret' }

describe('providersFromEnv', () => {
  it('serves nothing by default', () => {
    expect(providersFromEnv({}, URL)).toEqual({})
  })

  it('serves the fake provider for all three when asked, never in production', () => {
    expect(describeProviders(providersFromEnv({ ...FAKE }, URL))).toBe('github: fake, jira: fake, bitbucket: fake')
    expect(describeProviders(providersFromEnv({ CONNECT_FAKE_PROVIDER: '1', CONNECT_ENV: 'development' }, URL))).toBe('github: fake, jira: fake, bitbucket: fake')
    expect(() => providersFromEnv({ ...FAKE, NODE_ENV: 'production' }, URL)).toThrow(/never in production/)
  })

  it('refuses the fake provider unless the environment is named development or staging (Workers set no NODE_ENV)', () => {
    expect(() => providersFromEnv({ CONNECT_FAKE_PROVIDER: '1' }, URL)).toThrow(/CONNECT_ENV=development or staging/)
    expect(() => providersFromEnv({ CONNECT_FAKE_PROVIDER: '1', CONNECT_ENV: 'production' }, URL)).toThrow(/CONNECT_ENV/)
  })

  it('uses the real GitHub App when it is configured, alongside the fakes', () => {
    expect(describeProviders(providersFromEnv(GITHUB, URL))).toBe('github: real app, jira: off, bitbucket: off')
    expect(describeProviders(providersFromEnv({ ...GITHUB, ...FAKE }, URL))).toBe('github: real app, jira: fake, bitbucket: fake')
  })
})

describe('real Atlassian and Bitbucket apps', () => {
  it('serve Jira and Bitbucket when configured, real apps winning over the fakes', () => {
    const env = { ATLASSIAN_CLIENT_ID: 'atl', ATLASSIAN_CLIENT_SECRET: 's', BITBUCKET_CLIENT_ID: 'Key1', BITBUCKET_CLIENT_SECRET: 's', ...FAKE }
    expect(describeProviders(providersFromEnv(env, URL))).toBe('github: fake, jira: real app, bitbucket: real app')
  })
})

describe('jiraRelayFromEnv', () => {
  it('is on by default for Atlassian Cloud only, and can add Data Center hosts or be turned off', () => {
    expect(jiraRelayFromEnv({})).toEqual({ extraHosts: [] })
    expect(jiraRelayFromEnv({ JIRA_RELAY_HOSTS: ' Jira.Acme.internal, ,jira2.acme.internal ' })).toEqual({ extraHosts: ['jira.acme.internal', 'jira2.acme.internal'] })
    expect(jiraRelayFromEnv({ JIRA_RELAY: 'off' })).toBeUndefined()
    expect(() => jiraRelayFromEnv({ JIRA_RELAY_HOSTS: 'https://jira.acme.com' })).toThrow(/isn't a host name/)
  })
})
