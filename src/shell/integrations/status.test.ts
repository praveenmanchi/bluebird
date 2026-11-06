import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS as D } from '@shared/integrations'
import { sectionStatus } from './status'

describe('sectionStatus', () => {
  it('needs both the key and the repository for GitHub', () => {
    expect(sectionStatus('github', D.github)).toBe('missing')
    expect(sectionStatus('github', { ...D.github, repo: 'a/b' })).toBe('missing')
    expect(sectionStatus('github', { ...D.github, repo: 'a/b', apiKey: 'k' })).toBe('configured')
  })

  it('counts any one notification channel', () => {
    expect(sectionStatus('notifications', D.notifications)).toBe('missing')
    expect(sectionStatus('notifications', { ...D.notifications, emails: 'a@b.co' })).toBe('configured')
  })

  it('reads Storybook and Zeroheight from what they need to link', () => {
    expect(sectionStatus('storybook', { ...D.storybook, baseUrl: 'https://sb.example.com' })).toBe('configured')
    expect(sectionStatus('zeroheight', { ...D.zeroheight, apiKey: 'k' })).toBe('missing')
    expect(sectionStatus('zeroheight', { ...D.zeroheight, apiKey: 'k', styleguideId: '1' })).toBe('configured')
  })

  it('says Off for a section switched off, even when it is filled in', () => {
    const filled = { ...D.jira, projectKey: 'DS', apiKey: 'k', email: 'a@b.co', siteUrl: 'https://x.atlassian.net' }
    expect(sectionStatus('jira', filled)).toBe('off')
    expect(sectionStatus('jira', { ...filled, enabled: true })).toBe('configured')
    expect(sectionStatus('jira', { ...D.jira, enabled: true })).toBe('missing')
  })

  it('needs a file and its key for Dual File', () => {
    expect(sectionStatus('dualFile', D.dualFile)).toBe('missing')
    expect(sectionStatus('dualFile', { ...D.dualFile, file1Id: 'abc', file1Key: 'k' })).toBe('configured')
  })

  it('agrees with the footer on MCP and UX AI', () => {
    expect(sectionStatus('mcp', { ...D.mcp, repo: 'a/b', token: 't' })).toBe('configured')
    expect(sectionStatus('ai', D.ai)).toBe('missing')
    expect(sectionStatus('ai', { ...D.ai, claudeKey: 'k' })).toBe('configured')
  })

  it('ignores spaces in a field', () => {
    expect(sectionStatus('storybook', { ...D.storybook, baseUrl: '   ' })).toBe('missing')
  })
})
