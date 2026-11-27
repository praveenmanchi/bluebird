// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { FAKE_CLOUD_ID, fakeProvider } from '../../tools/connect/providers/fake'

const INPUT = { code: 'abcdef123456', redirectUri: 'http://localhost:8788/auth/jira/callback', codeVerifier: 'v'.repeat(43) }

describe('fakeProvider', () => {
  it('names the site a fake Jira sign-in is for, like real Atlassian sign-in', async () => {
    expect((await fakeProvider('http://localhost:8788', 'jira').exchange({ ...INPUT, host: 'acme.atlassian.net' })).site)
      .toEqual({ cloudId: FAKE_CLOUD_ID, url: 'https://acme.atlassian.net' })
    expect((await fakeProvider('http://localhost:8788', 'bitbucket').exchange({ ...INPUT, host: 'bitbucket.org' })).site).toBeUndefined()
  })
})
