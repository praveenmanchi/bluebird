import { describe, it, expect } from 'vitest'
import { BUILD_VERSION, formatBuildDate } from './buildInfo'
import { bump } from '../../scripts/bump-build'

describe('build info', () => {
  it('exposes a MAJOR.MINOR.PATCH version', () => {
    expect(BUILD_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
  it('formats the stamp as day, short month, year', () => {
    expect(formatBuildDate('2026-10-28T09:30:00.000Z')).toBe('28 Oct 2026')
  })
  it('returns an empty string for a missing or invalid stamp', () => {
    expect(formatBuildDate('')).toBe('')
    expect(formatBuildDate('not a date')).toBe('')
  })
  it('bumps the patch and records the build time', () => {
    const now = new Date('2026-10-28T09:30:00.000Z')
    expect(bump({ version: '1.3.9', updatedAt: '' }, now)).toEqual({ version: '1.3.10', updatedAt: '2026-10-28T09:30:00.000Z' })
  })
})
