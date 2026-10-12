import { describe, it, expect } from 'vitest'
import { buildAnalytics, JIRA_STATUSES } from './mock'
import { fmt, niceTicks } from './card'
import { heatStep, HEAT_STEPS } from './bars'

describe('mock analytics', () => {
  it('gives the same numbers for the same filters, and different ones when a filter changes', () => {
    expect(buildAnalytics(30, 'all')).toEqual(buildAnalytics(30, 'all'))
    expect(buildAnalytics(30, 'ikea').kpis.activeUsers.value).not.toBe(buildAnalytics(30, 'all').kpis.activeUsers.value)
  })

  it('has one day per day of the period and a 7 × 24 heatmap', () => {
    const data = buildAnalytics(90, 'all')
    expect(data.daily).toHaveLength(90)
    expect(data.daily.at(-1)?.date).toBe('2026-10-12')
    expect(data.heat).toHaveLength(7)
    expect(data.heat.every((row) => row.length === 24)).toBe(true)
  })

  it('keeps people to the filtered brand and sorts every ranked list', () => {
    const data = buildAnalytics(30, 'fiskars')
    expect(new Set(data.users.map((u) => u.brand))).toEqual(new Set(['Fiskars']))
    const sorted = (xs: readonly number[]) => xs.every((x, i) => i === 0 || xs[i - 1]! >= x)
    expect(sorted(data.features.map((f) => f.sessions))).toBe(true)
    expect(sorted(data.brands.map((b) => b.installs))).toBe(true)
    expect(sorted(data.jira.designers.map((d) => d.hoursLogged))).toBe(true)
    expect(data.jira.tickets.every((t) => JIRA_STATUSES.includes(t.status))).toBe(true)
  })
})

describe('chart helpers', () => {
  it('picks clean ticks that cover the maximum', () => {
    expect(niceTicks(234)).toEqual([0, 100, 200, 300])
    expect(niceTicks(17)).toEqual([0, 5, 10, 15, 20])
    expect(niceTicks(0)).toEqual([0, 1])
  })

  it('compacts large numbers and keeps one decimal on small fractions', () => {
    expect(fmt(1284)).toBe('1,284')
    expect(fmt(12_900)).toBe('12.9K')
    expect(fmt(4.84)).toBe('4.8')
  })

  it('bands heat values so nothing and very little share the quiet step', () => {
    expect(heatStep(0, 100)).toBe(0)
    expect(heatStep(10, 100)).toBe(0)
    expect(heatStep(100, 100)).toBe(HEAT_STEPS.length - 1)
  })
})
