import { describe, it, expect } from 'vitest'
import * as z from 'zod/mini'
import { historyEntrySchema, type HistoryEntry } from '@shared/history/types'
import { approveEntry, changelogEntry, changelogMarkdown, changelogPath, countLine, draftTitle, isPending, prependChangelog, type ChangelogInput } from '../changelog'
import { SAMPLE_CHANGES } from '../fixtures'

const input = (over: Partial<ChangelogInput> = {}): ChangelogInput => ({
  changes: SAMPLE_CHANGES, title: 'Button refresh', notes: '', ticket: 'BB-342', by: 'Praveen Manchi', team: 'Design System',
  file: 'button-refresh', main: 'Project Bluebird UI', page: 'Atoms', warnings: [], time: '09:32', ...over,
})
const saved = (over: Partial<ChangelogInput> = {}): HistoryEntry => ({ ...changelogEntry(input(over)), schema: 1, id: 'abc1234', at: '2026-11-12T09:32:00.000Z' })

describe('changelogEntry', () => {
  it('starts under review with the ticket, the author and counts per kind', () => {
    const e = saved()
    expect(z.safeParse(historyEntrySchema, e).success).toBe(true)
    expect(e).toMatchObject({ type: 'changelog', status: 'review', title: 'Button refresh', ticket: 'BB-342', by: { name: 'Praveen Manchi', team: 'Design System' }, file: 'button-refresh' })
    expect(e.variables).toBe('1 added · 2 modified · 1 removed')
    expect(e.components).toBe('1 added · 1 modified')
    expect(e.details!.stats!.map((s) => s.value)).toEqual(['4', '2', '1'])
    expect(e.details!.notice).toMatchObject({ tone: 'error', title: '1 breaking change' })
    expect(isPending(e)).toBe(true)
  })

  it('lists variables and components as added, modified and removed', () => {
    const [vars, comps] = saved().details!.sections!
    if (vars?.kind !== 'changes' || comps?.kind !== 'changes') throw new Error('expected change sections')
    expect(vars.unit).toBe('variable')
    expect(vars.groups.map((g) => g.rows.map((r) => r.name))).toEqual([['feedback/info'], ['button/bg/primary', 'radius/control'], ['surface/translucent']])
    expect(vars.groups[1]!.rows[0]).toEqual({ name: 'button/bg/primary', valueKind: 'color', old: '#0C8CE9', new: '#0978C8', scope: 'Bridge', note: 'Used by Button, Date picker' })
    expect(vars.groups[2]!.rows[0]).toMatchObject({ old: '#FFFFFF1A', breaking: true })
    expect(comps.unit).toBe('component')
    expect(comps.groups[1]!.rows[0]).toEqual({ name: 'Button', valueKind: 'text', note: '+2 variants · +Loading' })
  })

  it('uses the author’s notes, and falls back to a summary, a drafted title and a warning notice', () => {
    expect(saved({ notes: 'Darker primary.' }).details!.description).toBe('Darker primary.')
    const quiet = saved({ changes: [], title: ' ', ticket: '', team: '', warnings: ['Variables were not compared: no scope'] })
    expect(quiet.title).toBe('Changelog')
    expect(quiet.ticket).toBeUndefined()
    expect(quiet.variables).toBeUndefined()
    expect(quiet.details!.description).toBe('No changes on button-refresh, compared with Project Bluebird UI.')
    expect(quiet.details!.notice).toMatchObject({ tone: 'info', body: 'Variables were not compared: no scope' })
    expect(quiet.details!.sections).toEqual([])
  })
})

describe('draftTitle and countLine', () => {
  it('prefers the branch name, then the components that changed', () => {
    expect(draftTitle(SAMPLE_CHANGES, 'button-refresh')).toBe('button-refresh')
    expect(draftTitle(SAMPLE_CHANGES, '')).toBe('Filter chip, Button')
    expect(draftTitle(SAMPLE_CHANGES.slice(0, 4), '')).toBe('surface, feedback and 2 more')
    expect(countLine([], 'variable')).toBe('')
  })
})

describe('approveEntry', () => {
  it('marks it done, credits the reviewer and links the published changelog', () => {
    const a = approveEntry(saved(), { by: 'Anita Rao', at: '2026-11-12T11:00:00.000Z', link: { url: 'https://github.com/acme/ds/blob/main/.bluebird/DESIGN-CHANGELOG.md', label: 'Open the changelog' } })
    expect(z.safeParse(historyEntrySchema, a).success).toBe(true)
    expect(a).toMatchObject({ status: 'done', review: { by: 'Anita Rao' }, summary: 'Changelog approved by Anita Rao · button-refresh', link: { label: 'Open the changelog' } })
    expect(a.details!.facts!.filter((f) => f.label === 'Review')).toEqual([{ label: 'Review', value: 'Approved by Anita Rao' }])
    expect(a.details!.activity!.at(-1)).toEqual({ title: 'Approved and published', detail: 'Anita Rao', time: '11:00' })
    expect(isPending(a)).toBe(false)
    expect(approveEntry({ ...saved(), details: undefined }, { by: 'A', at: '2026-11-12T11:00:00.000Z' }).link).toBeUndefined()
  })
})

describe('the shared changelog file', () => {
  it('sits beside the history folder', () => {
    expect(changelogPath('.bluebird/history')).toBe('.bluebird/DESIGN-CHANGELOG.md')
    expect(changelogPath('history')).toBe('history/DESIGN-CHANGELOG.md')
  })

  it('writes who, when, the ticket and each change', () => {
    const md = changelogMarkdown(approveEntry(saved({ notes: 'Darker *primary*.\nSecond line.' }), { by: 'Anita Rao', at: '2026-11-13T11:00:00.000Z' }))
    expect(md).toContain('## 2026-11-12 · Button refresh (BB-342)')
    expect(md).toContain('- Changed by: Praveen Manchi, Design System')
    expect(md).toContain('- Approved by: Anita Rao on 2026-11-13')
    expect(md).toContain('- Jira: BB-342')
    expect(md).toContain('Darker \\*primary\\*. Second line.')
    expect(md).toContain('### Variable changes')
    expect(md).toContain('**Updated**\n\n- `button/bg/primary` — \\#0C8CE9 → \\#0978C8 (Bridge)')
    expect(md).toContain('**Deleted**\n\n- `surface/translucent` — \\#FFFFFF1A (All brands) **breaking**')
    expect(md).toContain('- `Button` — +2 variants · +Loading')
    expect(changelogMarkdown(saved({ changes: [], ticket: '', team: '' }))).not.toContain('Jira')
  })

  it('puts the newest section on top and keeps one heading', () => {
    const first = prependChangelog(null, '## A\n')
    expect(first).toBe('# Design changelog\n\n## A\n')
    expect(prependChangelog(first, '## B\n')).toBe('# Design changelog\n\n## B\n\n## A\n')
    expect(prependChangelog('Hand-written notes', '## B')).toBe('# Design changelog\n\n## B\n\nHand-written notes\n')
  })
})
