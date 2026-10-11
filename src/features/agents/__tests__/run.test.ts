import { describe, it, expect } from 'vitest'
import { agentById } from '../fixtures'
import { filterCounts, matchesFilter, openFindings, overallProgress, pipelineState, revealedCount } from '../run'

describe('agents run helpers', () => {
  it('reveals findings evenly — 14 at 64% is the 9 the Running screen shows', () => {
    expect(revealedCount(14, 0)).toBe(0)
    expect(revealedCount(14, 64)).toBe(9)
    expect(revealedCount(14, 100)).toBe(14)
  })

  it('counts the Results filters from the fixture (All 14, Critical 2, Serious 4, Moderate 6, Minor 2, Fixable 6)', () => {
    expect(filterCounts(agentById('accessibility').findings)).toEqual({ all: 14, critical: 2, serious: 4, moderate: 6, minor: 2, fixable: 6 })
  })

  it('drops applied and ignored findings', () => {
    const findings = agentById('accessibility').findings
    expect(openFindings(findings, { a1: 'applied', a2: 'ignored' })).toHaveLength(12)
    expect(matchesFilter(findings[4]!, 'fixable')).toBe(false)
  })

  it('runs the pipeline one agent at a time and skips coming-soon agents', () => {
    const progress = { accessibility: 100, spelling: 40 }
    expect(pipelineState(agentById('accessibility'), progress)).toBe('done')
    expect(pipelineState(agentById('spelling'), progress)).toBe('running')
    expect(pipelineState(agentById('writing'), progress)).toBe('queued')
    expect(pipelineState(agentById('localization'), progress)).toBe('skipped')
    expect(overallProgress(progress)).toBe(28)
  })
})
