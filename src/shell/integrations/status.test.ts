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
    expect(sectionStatus('dualFile', { ...D.dualFile, token: 'k', files: [{ name: 'File 1', id: 'abc', role: 'Variables' }] })).toBe('configured')
    expect(sectionStatus('dualFile', { ...D.dualFile, token: 'k' })).toBe('missing')
  })

  it('counts MCP as configured once one scenario has its repository and token', () => {
    expect(sectionStatus('mcp', D.mcp)).toBe('missing')
    expect(sectionStatus('mcp', { ...D.mcp, componentRepo: 'a/b' })).toBe('missing')
    expect(sectionStatus('mcp', { ...D.mcp, componentRepo: 'a/b', screenToken: 't' })).toBe('missing')
    expect(sectionStatus('mcp', { ...D.mcp, libraryRepo: 'a/b', libraryToken: 't' })).toBe('configured')
    expect(sectionStatus('mcp', { ...D.mcp, libraryRepo: 'a/b', libraryToken: 't', screenRepo: 'a/c' })).toBe('configured')
    expect(sectionStatus('mcp', { ...D.mcp, enabled: false, libraryRepo: 'a/b', libraryToken: 't' })).toBe('off')
  })

  it('agrees with the footer on UX AI', () => {
    expect(sectionStatus('ai', D.ai)).toBe('missing')
    expect(sectionStatus('ai', { ...D.ai, claudeKey: 'k' })).toBe('configured')
  })

  it('ignores spaces in a field', () => {
    expect(sectionStatus('storybook', { ...D.storybook, baseUrl: '   ' })).toBe('missing')
  })

  it('Storage follows GitHub while it borrows the GitHub repository', () => {
    expect(sectionStatus('storage', D.storage, { github: D.github })).toBe('missing')
    expect(sectionStatus('storage', D.storage, { github: { ...D.github, repo: 'a/b', apiKey: 'k' } })).toBe('configured')
    expect(sectionStatus('storage', { ...D.storage, sameAsGithub: false }, { github: { ...D.github, repo: 'a/b', apiKey: 'k' } })).toBe('missing')
    expect(sectionStatus('storage', { ...D.storage, sameAsGithub: false, repo: 'a/h', apiKey: 'k' })).toBe('configured')
  })
})
