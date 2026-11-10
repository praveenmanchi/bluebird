import { describe, it, expect } from 'vitest'
import { buildReportDoc, type ReportView } from '../doc/report-doc'
import { sampleScan } from '../mock'
import type { ScanResult } from '../messages'

const scan: ScanResult = { ...sampleScan, standard: 'wcag22' }
const aaOnly: ReportView = { issues: scan.issues.filter((i) => i.level === 'fail'), nonText: scan.nonText, targets: scan.targets }
const options = { title: 'Login screen', platform: 'web' as const, scannedOn: '10 Nov 2026' }

describe('buildReportDoc', () => {
  const doc = buildReportDoc(scan, aaOnly, options)

  it('numbers the issues in display order: contrast, non-text, target', () => {
    expect(doc.issues.map((i) => [i.id, i.criterion])).toEqual([
      ['A11Y-01', '1.4.3 Contrast (Minimum)'],
      ['A11Y-02', '1.4.11 Non-text Contrast'],
      ['A11Y-03', '2.5.8 Target Size (Minimum)'],
      ['A11Y-04', '2.5.8 Target Size (Minimum)'],
    ])
  })

  it('counts severities and check types the way the cards show them', () => {
    expect(doc.severity).toEqual({ critical: 1, serious: 3, moderate: 0, minor: 0 })
    expect(doc.types).toEqual({ contrast: 1, nontext: 1, target: 2, code: 0 })
  })

  it('says the screen does not conform while issues are open', () => {
    expect(doc.verdict.badge).toEqual({ tone: 'critical', label: 'Does not conform' })
    expect(doc.verdict.headline).toBe('Not yet WCAG 2.2 AA')
    expect(doc.verdict.summary).toMatch(/^4 issues to fix: 1 critical and 3 serious\. 1 layer needs a manual check\./)
  })

  it('keeps every affected layer so the sandbox can link each one', () => {
    expect(doc.issues[0]?.nodeIds).toEqual(['1:1', '1:4', '1:5'])
    expect(doc.issues[0]?.layer).toBe('Caption · 3 layers')
  })

  it('gives a design fix from the suggested token and a code fix in CSS', () => {
    expect(doc.issues[0]?.designFix).toBe('Rebind the text to Brand/Text/Secondary. It reaches 7.36:1 in Bridge.')
    expect(doc.issues[0]?.codeFix).toBe('color: #52525B; /* Brand/Text/Secondary */')
    expect(doc.issues[2]?.codeFix).toBe('min-width: 24px;\nmin-height: 24px;')
  })

  it('writes the target fix in the platform’s own code', () => {
    const ios = buildReportDoc(scan, { ...aaOnly, targets: [{ ...scan.targets[0]!, platform: 'ios', required: 44 }] }, { ...options, platform: 'ios' })
    expect(ios.issues.at(-1)?.codeFix).toBe('.frame(minWidth: 44, minHeight: 44)')
  })

  it('links the right Understanding page', () => {
    expect(doc.issues[0]?.reference.url).toBe('https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html')
    expect(doc.issues[2]?.reference.url).toMatch(/target-size-minimum\.html$/)
  })

  it('lists unmeasurable layers as manual checks', () => {
    expect(doc.manual).toEqual([expect.objectContaining({ layer: 'Hero overline', nodeId: '1:9', why: 'Sits on an image fill, so contrast can’t be measured.' })])
  })

  it('reports what was checked, including what a scan cannot decide', () => {
    const rows = doc.checks.map((c) => [c.criterion.split(' ')[0], c.result.label, c.failing])
    expect(rows).toContainEqual(['1.4.3', 'Fail', '1'])
    expect(rows).toContainEqual(['1.4.6', 'Pass', '0'])
    expect(rows).toContainEqual(['4.1.2', 'Check by hand', '—'])
  })

  it('passes cleanly when nothing is open', () => {
    const clean = buildReportDoc({ ...scan, unmeasurable: [] }, { issues: [], nonText: [], targets: [] }, options)
    expect(clean.verdict.badge.tone).toBe('pass')
    expect(clean.totals[1]).toEqual({ value: '0', label: 'Issues to fix', note: 'none found' })
  })
})
