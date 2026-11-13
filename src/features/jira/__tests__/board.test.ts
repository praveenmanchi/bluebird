import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTERS, boardDefaults, filterTickets, openingScope, groupByStatus, hasActiveFilters, matchesQuery, sprintOptions, subtaskProgress, updateTicket,
  withComment, withLink, withoutComment, withPoints, withStatus, withSubtask, withSubtaskToggled, withWorkLogged,
} from '../board'
import { ME, TICKETS } from '../fixtures'

const bb142 = TICKETS.find((t) => t.key === 'BB-142')!

describe('jira board logic', () => {
  it('groups the default view like the Figma list', () => {
    const groups = groupByStatus(filterTickets(TICKETS, boardDefaults('Sprint 42', TICKETS)))
    expect(groups.map((g) => g.heading)).toEqual(['IN PROGRESS · 2', 'IN REVIEW · 1', 'TO DO · 3'])
    expect(groups[0]!.tickets.map((t) => t.key)).toEqual(['BB-142', 'BB-138'])
  })

  it('searches key, title and labels case-insensitively', () => {
    expect(matchesQuery(bb142, 'bb-142')).toBe(true)
    expect(matchesQuery(bb142, 'DETAIL VIEW')).toBe(true)
    expect(matchesQuery(bb142, 'a11y')).toBe(true)
    expect(matchesQuery(bb142, 'storybook')).toBe(false)
    expect(matchesQuery(bb142, '   ')).toBe(true)
  })

  it('filters by scope, status, sprint and priority', () => {
    const defaults = boardDefaults('Sprint 42', TICKETS)
    const keys = (f: Partial<typeof DEFAULT_FILTERS>) => filterTickets(TICKETS, { ...defaults, ...f }).map((t) => t.key)
    expect(keys({ scope: 'reported' })).toEqual(['BB-131', 'BB-155'])
    expect(keys({ scope: 'reported', sprint: 'All sprints' })).toEqual(['BB-131', 'BB-155', 'BB-119'])
    expect(keys({ status: 'todo' })).toEqual(['BB-155', 'BB-157', 'BB-160'])
    expect(keys({ priority: 'highest' })).toEqual(['BB-138'])
    expect(hasActiveFilters(defaults, defaults)).toBe(false)
    expect(hasActiveFilters({ ...defaults, query: 'x' }, defaults)).toBe(true)
    expect(hasActiveFilters({ ...defaults, sprint: 'All sprints' }, defaults)).toBe(true)
    expect(sprintOptions(TICKETS, 'Sprint 42')).toEqual(['Sprint 42', 'Sprint 41', 'All sprints'])
    expect(openingScope(TICKETS, 'assigned')).toBe('assigned')
    const reportedOnly = TICKETS.map((t) => ({ ...t, scopes: t.scopes.filter((s) => s !== 'assigned') }))
    expect(openingScope(reportedOnly, 'assigned')).toBe('reported')
    expect(openingScope([], 'assigned')).toBe('assigned')
  })

  // An active sprint holding none of the tickets would open the board empty, and `refined` measures
  // against the defaults — so the Filters button would stay unlit with no hint of what hid them.
  it('opens on every sprint when the active one has no tickets', () => {
    expect(boardDefaults('Sprint 42', TICKETS).sprint).toBe('Sprint 42')
    expect(boardDefaults('Sprint 99', TICKETS).sprint).toBe('All sprints')
    expect(boardDefaults(null, TICKETS).sprint).toBe('All sprints')
    expect(boardDefaults('Sprint 42', []).sprint).toBe('All sprints')
    // The fallback must leave a non-empty board rather than a filtered-empty one.
    const defaults = boardDefaults('Sprint 99', TICKETS)
    expect(filterTickets(TICKETS, defaults).length).toBeGreaterThan(0)
    expect(hasActiveFilters(defaults, defaults)).toBe(false)
  })

  it('updates tickets without mutating the originals', () => {
    const next = updateTicket(TICKETS, 'BB-142', (t) => withStatus(t, 'in-review', ME))
    const moved = next.find((t) => t.key === 'BB-142')!
    expect(moved.status).toBe('in-review')
    expect(moved.history[0]!.body).toBe('changed Status from In progress to In review')
    expect(bb142.status).toBe('in-progress')
    expect(next[1]).toBe(TICKETS[1])
    expect(withStatus(bb142, 'in-progress', ME)).toBe(bb142)
  })

  it('edits points, subtasks, comments, links and work log', () => {
    expect(withPoints(bb142, 8, ME).points).toBe(8)
    expect(withPoints(bb142, 5, ME)).toBe(bb142)
    expect(subtaskProgress(withSubtaskToggled(bb142, 's3', true))).toBe('3/4')
    expect(subtaskProgress(withSubtask(bb142, 'New subtask'))).toBe('2/5')
    const commented = withComment(bb142, '  Looks good  ', ME)
    expect(commented.comments[0]).toMatchObject({ body: 'Looks good', author: ME })
    expect(withoutComment(commented, commented.comments[0]!.id).comments).toEqual(bb142.comments)
    const linked = withLink(bb142, { nodeId: '1:2', frame: 'Frame', path: 'File › Page' })
    expect(linked.links).toHaveLength(3)
    expect(withLink(linked, { nodeId: '1:2', frame: 'Frame', path: 'File › Page' })).toBe(linked)
    expect(withWorkLogged(bb142, 'Logged 1h', ME).worklog[0]!.body).toBe('Logged 1h')
  })
})
