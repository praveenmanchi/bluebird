import { describe, it, expect } from 'vitest'
import { agentById } from '../agents'
import { SAMPLE_FINDINGS, sampleRun } from '../fixtures'
import { annotationLabel, chatContext, filterCounts, markdownReport, matchesFilter, openFindings, overallProgress, pipelineState, runSummary } from '../run'

describe('agents run helpers', () => {
  it('counts the Results filters from the sample (All 14, Critical 2, Serious 4, Moderate 6, Minor 2, Fixable 6)', () => {
    expect(filterCounts(SAMPLE_FINDINGS.accessibility)).toEqual({ all: 14, critical: 2, serious: 4, moderate: 6, minor: 2, fixable: 6 })
  })

  it('drops applied and ignored findings but keeps failed ones', () => {
    const findings = SAMPLE_FINDINGS.accessibility
    expect(openFindings(findings, { 'accessibility:1.4.3:a1': 'applied', 'accessibility:1.4.3:a2': 'ignored', 'accessibility:1.4.11:a3': 'failed' })).toHaveLength(12)
    expect(matchesFilter(findings[4]!, 'fixable')).toBe(false)
  })

  it('runs the pipeline one agent at a time', () => {
    const progress = { accessibility: 100, 'design-system': 40 }
    expect(pipelineState(agentById('accessibility'), progress)).toBe('done')
    expect(pipelineState(agentById('design-system'), progress)).toBe('running')
    expect(pipelineState(agentById('content'), progress)).toBe('queued')
    expect(overallProgress(progress)).toBe(23)
  })

  it('summarises a run, labels an annotation and builds the chat context and the Markdown report', () => {
    const result = sampleRun('accessibility', 'selection')
    expect(runSummary(result)).toBe('14 issues · 6 fixable')
    expect(runSummary({ ...result, findings: [] })).toBe('No issues found')
    expect(annotationLabel(result.findings[0]!)).toBe('WCAG 1.4.3 — Key text is 2.9:1 on the selected row — needs 4.5:1. Fix: jira/text/key → text/primary (7.8:1).')
    const context = chatContext(agentById('accessibility'), result, { 'accessibility:1.4.3:a1': 'applied' })
    expect(context).toContain('Scope: Checkout flow (3 frames, 148 layers). Score: 70/100.')
    expect(context).toContain('13 open findings (5 safe to apply), 1 already applied or ignored.')
    expect(chatContext(agentById('spelling'), undefined, {})).toContain('No run yet')
    expect(markdownReport(agentById('accessibility'), result, result.findings.slice(0, 1))).toContain('- **CRITICAL** Key text is 2.9:1')
  })
})
