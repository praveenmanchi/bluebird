import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { textToAdf } from './adf'
import { jiraConnection, openTicketsJql, postComment, searchOpenTickets } from './tickets'
import type { JiraConfig } from './http'

const cloud: JiraConfig = { flavor: 'cloud', site: 'https://acme.atlassian.net', endpoint: 'https://acme.atlassian.net', authorization: 'Basic x', projectKey: 'BB' }

describe('shared Jira tickets', () => {
  it('scopes the open tickets to the project, else the person', () => {
    expect(openTicketsJql('BB')).toBe('project = "BB" AND statusCategory != Done ORDER BY updated DESC')
    expect(openTicketsJql(' "x" ')).toBe('project = "x" AND statusCategory != Done ORDER BY updated DESC')
    expect(openTicketsJql('')).toBe('assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC')
  })

  it('says what Settings are missing', () => {
    expect(jiraConnection(DEFAULT_INTEGRATIONS.jira)).toEqual({ problem: expect.stringMatching(/switched off/) })
    expect(jiraConnection({ ...DEFAULT_INTEGRATIONS.jira, enabled: true, siteUrl: 'https://acme.atlassian.net', email: 'p@acme.com', apiKey: 't' })).toMatchObject({ config: { flavor: 'cloud' } })
  })

  it('searches Cloud and Server, and posts comments as ADF or text', async () => {
    const calls: { url: string; body?: string }[] = []
    const fetchImpl = async (url: string, init: { body?: string }) => {
      calls.push({ url, body: init.body })
      return { status: 200, text: async () => url.includes('/search') ? JSON.stringify({ issues: [{ key: 'BB-1', fields: { summary: 'One', status: { name: 'To Do' } } }, { fields: {} }] }) : '' }
    }
    expect(await searchOpenTickets(cloud, fetchImpl)).toEqual([{ key: 'BB-1', title: 'One', status: 'To Do' }])
    await searchOpenTickets({ ...cloud, flavor: 'server' }, fetchImpl)
    expect(calls.map((c) => c.url)).toEqual(['https://acme.atlassian.net/rest/api/3/search/jql', 'https://acme.atlassian.net/rest/api/2/search'])
    await postComment(cloud, fetchImpl, 'BB-1', 'Hi https://figma.com/x')
    await postComment({ ...cloud, flavor: 'server' }, fetchImpl, 'BB-1', 'Plain')
    expect(JSON.parse(calls[2]!.body!).body.type).toBe('doc')
    expect(JSON.parse(calls[3]!.body!)).toEqual({ body: 'Plain' })
  })

  it('makes links in a comment clickable', () => {
    expect(textToAdf('See https://www.figma.com/design/a now').content[0]!.content).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'text', text: 'https://www.figma.com/design/a', marks: [{ type: 'link', attrs: { href: 'https://www.figma.com/design/a' } }] },
      { type: 'text', text: ' now' },
    ])
  })
})
