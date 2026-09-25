import { describe, it, expect } from 'vitest'
import { annotationForContrast, annotationForNonText, annotationForTarget } from '../annotate'
import type { ContrastIssue, NonTextIssue, TargetSizeIssue } from '../messages'

const base: ContrastIssue = {
  nodeId: '1', nodeIds: ['1'], occurrences: 1, name: 'Caption', text: 'Hello',
  fontSize: 12, isBold: false, foreground: '#a1a1aa', background: '#ffffff',
  ratio: 2.55, level: 'fail',
}

describe('annotationForContrast', () => {
  it('leads with the criterion, the measurement and the bar', () => {
    expect(annotationForContrast(base, '1.4.3', 4.5).label)
      .toContain('WCAG 1.4.3 — 2.55:1, needs 4.5:1.')
  })
  it('names the colours in a form a developer can paste', () => {
    expect(annotationForContrast(base, '1.4.3', 4.5).label).toContain('#A1A1AA on #FFFFFF.')
  })
  it('adds the token and the suggested fix when they are known', () => {
    const label = annotationForContrast({
      ...base,
      fgToken: { id: 'v', name: 'Brand/Text/Muted', mode: 'Bridge' },
      fix: { tokenId: 'v2', tokenName: 'Brand/Text/Secondary', hex: '#52525b', ratio: 7.36, mode: 'Bridge' },
    }, '1.4.3', 4.5).label
    expect(label).toContain('Bound to Brand/Text/Muted (Bridge).')
    expect(label).toContain('Fix: use Brand/Text/Secondary — 7.36:1.')
  })
  it('warns which other brand modes fail, and stays silent when none do', () => {
    const failing = annotationForContrast({
      ...base,
      brandModes: [{ brand: 'Bridge', pass: false, ratio: 2.55 }, { brand: 'Ikea', pass: true, ratio: 7.1 }],
    }, '1.4.3', 4.5).label
    expect(failing).toContain('Also fails in: Bridge.')
    expect(annotationForContrast(base, '1.4.3', 4.5).label).not.toContain('Also fails in')
  })
})

describe('annotationForNonText', () => {
  it('states the 3:1 bar', () => {
    const issue: NonTextIssue = { nodeId: '1', nodeIds: ['1'], occurrences: 1, name: 'Input border', foreground: '#e4e4e7', background: '#ffffff', ratio: 1.24 }
    expect(annotationForNonText(issue).label).toContain('WCAG 1.4.11 — border measures 1.24:1, needs 3:1.')
  })
})

describe('annotationForTarget', () => {
  const issue: TargetSizeIssue = { nodeId: '1', nodeIds: ['1'], occurrences: 1, name: 'Close', width: 16, height: 16, required: 24, evidence: 'reaction' }

  it('cites 2.5.8 at the 24px bar', () => {
    expect(annotationForTarget(issue).label).toContain('WCAG 2.5.8 — target is 16×16px, needs 24×24px.')
  })
  it('cites 2.5.5 at the 44px bar', () => {
    expect(annotationForTarget({ ...issue, width: 32, height: 32, required: 44 }).label).toContain('WCAG 2.5.5')
  })
  it('tells the developer padding is an acceptable fix', () => {
    expect(annotationForTarget(issue).label).toContain('padding is enough')
  })
})
