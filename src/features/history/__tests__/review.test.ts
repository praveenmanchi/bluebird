import { describe, it, expect } from 'vitest'
import type { HistoryEntry } from '@shared/history/types'
import { SAMPLE_CHANGES } from '../fixtures'
import { BRANCH_FACT, COMMENT_ROWS, approvalComment, branchUrl, entryBranchUrl, reviewLines, submitComment } from '../review'

const input = { title: 'Button refresh', notes: 'Darker primary.', file: 'button-refresh', main: 'Project Bluebird UI', by: 'Praveen Manchi', changes: SAMPLE_CHANGES, branch: 'https://www.figma.com/design/MAINKEY/branch/BRKEY/button-refresh' }

describe('changelog review links', () => {
  it('builds the branch link, and refuses keys that are not keys', () => {
    expect(branchUrl('naqp6r4h5V4KUgTTmwe9U5', 'Br4nch', 'button refresh!')).toBe('https://www.figma.com/design/naqp6r4h5V4KUgTTmwe9U5/branch/Br4nch/button-refresh')
    expect(branchUrl('../x', 'Br4nch', 'a')).toBe('')
    expect(branchUrl('MAINKEY', 'BRKEY', '   ')).toMatch(/\/branch$/)
  })

  it('writes the submit comment with every change, the notes and the branch', () => {
    const text = submitComment(input)
    expect(text.split('\n')[0]).toBe('Changelog sent for review: Button refresh')
    expect(text).toContain('Darker primary.')
    expect(text).toMatch(/Variables \(.+\)/)
    expect(text).toMatch(/Components \(.+\)/)
    expect(text).toContain(`Figma branch: ${input.branch}`)
    expect(submitComment({ ...input, changes: [], notes: '', branch: '' })).toBe('Changelog sent for review: Button refresh\nbutton-refresh compared with Project Bluebird UI · by Praveen Manchi\n\nNo variable or component changes.')
    const many = Array.from({ length: COMMENT_ROWS + 3 }, (_, i) => ({ ...SAMPLE_CHANGES[0]!, id: `v${i}`, name: `v/${i}` }))
    expect(submitComment({ ...input, changes: many })).toContain('- and 3 more (all of them are in Bluebird History)')
  })

  it('writes the approval comment with the changelog and branch links', () => {
    const entry = { title: 'Button refresh', by: { name: 'Praveen Manchi' }, variables: '1 modified', details: { facts: [{ label: BRANCH_FACT, value: input.branch }] } } as unknown as HistoryEntry
    expect(entryBranchUrl(entry)).toBe(input.branch)
    expect(approvalComment(entry, 'Ravi Kumar', 'https://github.com/acme/ds/blob/main/DESIGN-CHANGELOG.md')).toBe([
      'Changelog approved: Button refresh', 'Reviewed by Ravi Kumar · changed by Praveen Manchi', '', 'Variables: 1 modified', '',
      'Added to the design changelog: https://github.com/acme/ds/blob/main/DESIGN-CHANGELOG.md', `Figma branch: ${input.branch}`,
    ].join('\n'))
    const bare = { ...entry, variables: undefined, details: { facts: [{ label: BRANCH_FACT, value: 'javascript:alert(1)' }] } } as unknown as HistoryEntry
    expect(entryBranchUrl(bare)).toBe('')
    expect(approvalComment(bare, 'Ravi', '')).not.toContain('Figma branch')
  })

  it('tells the reviewers what to look at', () => {
    expect(reviewLines(input, 'BB-342')).toEqual([expect.stringContaining('Praveen Manchi sent "Button refresh" for review'), expect.stringMatching(/^Variables: /), 'Jira: BB-342', 'Open Bluebird › History to review and approve it.'])
    expect(reviewLines({ ...input, changes: [] }, '')[1]).toBe('No variable or component changes.')
  })
})
