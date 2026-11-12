import { describe, it, expect } from 'vitest'
import { MAX_PER_DAY, appendToDay, dayPath, daysInRange, newEntryId, parseDay, teamShort } from './store'
import type { HistoryEntry } from './types'

const entry = (id: string, at: string, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  schema: 1, id, type: 'extraction', status: 'done', title: 'Button refresh', summary: 'Pushed', at, by: { name: 'Praveen' }, file: 'Bluebird UI', ...over,
})

describe('history store', () => {
  it('files entries by UTC day', () => {
    expect(dayPath('2026-11-12T23:59:00.000Z')).toBe('.bluebird/history/2026-11-12.json')
  })

  it('picks the day files in range, newest first, and ignores other files', () => {
    expect(daysInRange(['2026-11-01.json', 'README.md', '2026-11-12.json', '2026-11-05.json', 'x.json'], '2026-11-05')).toEqual(['2026-11-12', '2026-11-05'])
  })

  it('appends newest first, replaces by id, and caps the day', () => {
    const a = entry('aaaaaa1', '2026-11-12T09:00:00.000Z'), b = entry('bbbbbb2', '2026-11-12T10:00:00.000Z')
    const day = parseDay(appendToDay(parseDay(appendToDay([], a)), b))
    expect(day.map((e) => e.id)).toEqual(['bbbbbb2', 'aaaaaa1'])
    expect(parseDay(appendToDay(day, { ...a, title: 'Renamed' })).find((e) => e.id === 'aaaaaa1')!.title).toBe('Renamed')
    const many = Array.from({ length: MAX_PER_DAY + 3 }, (_, i) => entry(`cccccc${i}`, new Date(Date.UTC(2026, 10, 12, 0, 0, i)).toISOString()))
    expect(parseDay(appendToDay(many, b))).toHaveLength(MAX_PER_DAY)
  })

  it('drops entries that do not match the schema, and survives a broken file', () => {
    const good = entry('dddddd1', '2026-11-12T09:00:00.000Z')
    const raw = JSON.stringify({ schema: 1, entries: [good, { ...good, id: 'x' }, { ...good, link: { url: 'javascript:alert(1)', label: 'x' } }, { nope: true }] })
    expect(parseDay(raw).map((e) => e.id)).toEqual(['dddddd1'])
    for (const bad of [null, '', 'not json', '{}', '{"entries":3}']) expect(parseDay(bad)).toEqual([])
  })

  it('shortens team names for the card', () => {
    expect(teamShort('Design System')).toBe('DS')
    expect(teamShort('UI/UX Designer')).toBe('UD')
    expect(teamShort('Dev')).toBe('Dev')
    expect(teamShort(undefined)).toBe('')
  })

  it('makes ids the schema accepts', () => {
    const id = newEntryId(new Date('2026-11-12T09:00:00.000Z'), () => 0.5)
    expect(id).toMatch(/^[a-z0-9]{6,64}$/)
  })
})
