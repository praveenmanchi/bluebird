// Which providers a broker serves, from its environment. Real apps win over the fake one, so a
// developer can try real GitHub sign-in while Jira and Bitbucket stay fake.
import { atlassianConfigFromEnv, atlassianProvider } from './providers/atlassian'
import { bitbucketConfigFromEnv, bitbucketProvider } from './providers/bitbucket'
import { fakeProvider } from './providers/fake'
import { githubConfigFromEnv, githubProvider } from './providers/github'
import { SERVICES, type Provider, type Service } from './providers/types'

export type Env = Readonly<Record<string, string | undefined>>

const FAKE_ENVS: ReadonlySet<string> = new Set(['development', 'staging'])

export function providersFromEnv(env: Env, publicUrl: string): Partial<Record<Service, Provider>> {
  const fake = env.CONNECT_FAKE_PROVIDER === '1'
  // Opt-in by name, not opt-out: Workers never set NODE_ENV, so a production config that forgot it
  // would otherwise serve fake sign-ins.
  if (fake && (env.NODE_ENV === 'production' || !FAKE_ENVS.has(env.CONNECT_ENV ?? ''))) {
    throw new Error('The fake provider runs only with CONNECT_ENV=development or staging, never in production. Unset CONNECT_FAKE_PROVIDER.')
  }
  const providers: Partial<Record<Service, Provider>> = fake ? Object.fromEntries(SERVICES.map((s) => [s, fakeProvider(publicUrl, s)])) : {}
  const github = githubConfigFromEnv(env)
  const atlassian = atlassianConfigFromEnv(env)
  const bitbucket = bitbucketConfigFromEnv(env)
  return {
    ...providers,
    ...(github ? { github: githubProvider(github) } : {}),
    ...(atlassian ? { jira: atlassianProvider(atlassian) } : {}),
    ...(bitbucket ? { bitbucket: bitbucketProvider(bitbucket) } : {}),
  }
}

/**
 * The Jira relay: on unless JIRA_RELAY=off. JIRA_RELAY_HOSTS adds a gateway's own Jira Data Center
 * hosts ("jira.acme.internal, jira2.acme.internal"); Bluebird Cloud leaves it empty (*.atlassian.net only).
 */
export function jiraRelayFromEnv(env: Env): { extraHosts: string[] } | undefined {
  if (env.JIRA_RELAY === 'off') return undefined
  const extraHosts = (env.JIRA_RELAY_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
  for (const host of extraHosts) {
    if (!/^[a-z0-9.-]{1,253}$/.test(host)) throw new Error(`JIRA_RELAY_HOSTS: "${host}" isn't a host name.`)
  }
  return { extraHosts }
}

/** One line per service for the startup log: which app serves it. */
export function describeProviders(providers: Partial<Record<Service, Provider>>): string {
  return SERVICES.map((s) => `${s}: ${providers[s]?.consentPage ? 'fake' : providers[s] ? 'real app' : 'off'}`).join(', ')
}
