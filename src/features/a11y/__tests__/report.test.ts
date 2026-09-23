import { describe, it, expect } from 'vitest'
import { buildReport, reportToMarkdown, type ReportMeta } from '../report'
import type { ScanResult } from '../messages'

const meta: ReportMeta = { file: 'Plugin UI', page: 'Home', brand: 'Bridge', generatedAt: '2026-09-23T08:00:00.000Z' }

const result: ScanResult = {
  scope: 'page',
  meta: { file: 'Plugin UI', page: 'Home', brand: 'Bridge' },
  scanned: 1284,
  textNodes: 42,
  durationMs: 96,
  exempt: 4,
  instancesSkipped: 37,
  unmeasurable: [{ nodeId: '9', name: 'Hero overline', text: 'Spring', reason: 'sits on an image fill' }],
  issues: [{
    nodeId: '1', nodeIds: ['1', '2'], occurrences: 2, name: 'Caption', text: 'Hi',
    fontSize: 11, isBold: false, foreground: '#a1a1aa', background: '#ffffff', ratio: 2.55, level: 'fail',
    fix: { tokenId: 'v', tokenName: 'Brand/Text/Secondary', hex: '#52525b', ratio: 7.36, mode: 'Bridge' },
  }],
  nonText: [{ nodeId: '3', nodeIds: ['3'], occurrences: 1, name: 'Input border', foreground: '#e4e4e7', background: '#ffffff', ratio: 1.24 }],
  targets: [{ nodeId: '4', nodeIds: ['4'], occurrences: 1, name: 'Close', width: 16, height: 16, required: 24, evidence: 'reaction' }],
}

describe('buildReport', () => {
  const report = buildReport(result, meta)

  it('carries the subject and the standard, so the artifact stands alone', () => {
    expect(report.meta).toEqual(meta)
    expect(report.standard).toBe('WCAG 2.2')
    expect(report.tool).toBe('Bluebird')
  })

  it('counts each criterion family separately and in total', () => {
    expect(report.summary).toMatchObject({ findings: 3, contrast: 1, nonText: 1, targetSize: 1 })
  })

  it('maps a failing contrast pair to 1.4.3 at AA, with its suggested fix', () => {
    const finding = report.findings.find((f) => f.criterion === '1.4.3')
    expect(finding).toMatchObject({ level: 'AA', actual: '2.55:1', required: '4.5:1', occurrences: 2 })
    expect(finding?.fix).toBe('Rebind to Brand/Text/Secondary (7.36:1)')
  })

  it('maps a pair that only misses AAA to 1.4.6', () => {
    const aaOnly = buildReport({ ...result, issues: [{ ...result.issues[0]!, level: 'aa', fix: undefined }] }, meta)
    expect(aaOnly.findings[0]).toMatchObject({ criterion: '1.4.6', level: 'AAA', required: '7:1' })
  })

  it('reports the target against the bar it actually missed', () => {
    expect(report.findings.find((f) => f.criterion === '2.5.8')).toMatchObject({ actual: '16 × 16 px', required: '24 × 24 px' })
    const enhanced = buildReport({ ...result, targets: [{ ...result.targets[0]!, width: 32, height: 32, required: 44 }] }, meta)
    expect(enhanced.findings.find((f) => f.criterion === '2.5.5')?.level).toBe('AAA')
  })

  it('records what was excluded, so the numbers can be audited', () => {
    expect(report.excluded.exemptCount).toBe(4)
    expect(report.excluded.unmeasurable).toEqual([{ nodeId: '9', layer: 'Hero overline', reason: 'sits on an image fill' }])
    expect(report.summary.instancesSkipped).toBe(37)
  })

  it('states plainly that a clean report is not a conformance claim', () => {
    expect(report.coverage.notCovered).toMatch(/not a conformance claim/)
    expect(report.coverage.automated).toContain('1.4.11 Non-text Contrast')
  })
})

describe('reportToMarkdown', () => {
  const md = reportToMarkdown(buildReport(result, meta))

  it('leads with the file and the scan metadata', () => {
    expect(md.startsWith('# Accessibility report — Plugin UI')).toBe(true)
    expect(md).toContain('- **Brand mode:** Bridge')
    expect(md).toContain('- **Generated:** 2026-09-23T08:00:00.000Z')
  })

  it('tabulates every finding', () => {
    expect(md).toContain('| 1.4.3 | Contrast (Minimum) | AA | Caption | 2 | 2.55:1 | 4.5:1 |')
    expect(md).toContain('| 1.4.11 |')
    expect(md).toContain('| 2.5.8 |')
  })

  it('escapes pipes so a layer name cannot break the table', () => {
    const piped = buildReport({ ...result, nonText: [{ ...result.nonText[0]!, name: 'Input | border' }] }, meta)
    expect(reportToMarkdown(piped)).toContain('Input \\| border')
  })

  it('lists the exclusions and the coverage caveat', () => {
    expect(md).toContain('4 layers exempt under WCAG 1.4.3')
    expect(md).toContain('37 repeated component instances scanned once')
    expect(md).toContain('Could not be measured')
    expect(md).toMatch(/not a conformance claim/)
  })

  it('says so plainly when there is nothing to report', () => {
    const clean = reportToMarkdown(buildReport({ ...result, issues: [], nonText: [], targets: [] }, meta))
    expect(clean).toContain('No automated findings.')
  })
})
