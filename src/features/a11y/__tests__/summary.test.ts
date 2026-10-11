import { describe, it, expect } from 'vitest'
import { summarizeScan, severityOf } from '../summary'
import type { ScanResult, ContrastIssue } from '../messages'

const contrast = (over: Partial<ContrastIssue> = {}): ContrastIssue => ({
  nodeId: 'c', nodeIds: ['c'], occurrences: 1, name: 'Label', text: 'x', fontSize: 12, isBold: false,
  foreground: '#999999', background: '#ffffff', ratio: 2.8, level: 'fail', ...over,
})

const base: ScanResult = {
  scope: 'page', meta: { file: 'F', page: 'P', brand: 'Bridge' }, scanned: 100, textNodes: 10,
  issues: [], nonText: [], targets: [], exempt: 0, unmeasurable: [], instancesSkipped: 0, durationMs: 5,
}

describe('severityOf', () => {
  it('mirrors the cards: contrast fail critical, assumed backdrop moderate, AAA target moderate', () => {
    expect(severityOf({ kind: 'contrast', issue: contrast() })).toBe('critical')
    expect(severityOf({ kind: 'contrast', issue: contrast({ level: 'aa' }) })).toBe('serious')
    expect(severityOf({ kind: 'contrast', issue: contrast({ assumedBackground: true }) })).toBe('moderate')
    expect(severityOf({ kind: 'nontext' })).toBe('serious')
    expect(severityOf({ kind: 'target', width: 16, height: 16 })).toBe('serious')
    expect(severityOf({ kind: 'target', width: 30, height: 30 })).toBe('moderate')
  })
})

describe('summarizeScan', () => {
  it('scores the share of components with no finding in their own layers', () => {
    const s = summarizeScan({
      ...base,
      inventory: {
        components: [
          { key: 'a', name: 'Button', level: 'atom', instances: 4, failing: false },
          { key: 'b', name: 'Badge', level: 'atom', instances: 2, failing: true },
          { key: 'c', name: 'Field', level: 'molecule', instances: 1, failing: false },
          { key: 'd', name: 'Card', level: 'organism', instances: 1, failing: true },
        ],
        frames: [{ nodeId: 'f', name: 'Login', failing: true }],
      },
    })
    expect(s.components).toEqual({ total: 4, passing: 2, failing: 2 })
    expect(s.score).toBe(50)
    expect(s.levels.atom).toEqual({ total: 2, passing: 1 })
    expect(s.levels.molecule).toEqual({ total: 1, passing: 1 })
    expect(s.levels.organism).toEqual({ total: 1, passing: 0 })
    expect(s.frames).toEqual({ total: 1, passing: 0 })
  })

  it('has no score — rather than 100% — when the scope holds no components', () => {
    const s = summarizeScan({ ...base, inventory: { components: [], frames: [] } })
    expect(s.score).toBeNull()
    expect(summarizeScan(base).score).toBeNull()
  })

  it('counts findings by principle and severity, and AA fails', () => {
    const s = summarizeScan({
      ...base,
      issues: [contrast(), contrast({ level: 'aa', nodeId: 'c2' })],
      nonText: [{ nodeId: 'n', nodeIds: ['n'], occurrences: 1, name: 'Border', foreground: '#eee', background: '#fff', ratio: 1.2 }],
      targets: [{ nodeId: 't', nodeIds: ['t'], occurrences: 1, name: 'Close', width: 16, height: 16, required: 24, evidence: 'reaction' }],
    })
    expect(s.findings).toBe(4)
    expect(s.failAA).toBe(1)
    expect(s.principles).toEqual({ perceivable: 3, operable: 1, understandable: 0, robust: 0 })
    expect(s.severity).toEqual({ critical: 1, serious: 3, moderate: 0, minor: 0 })
  })

  it('counts contrast findings failing in each brand mode, keeping the brands in scan order', () => {
    const s = summarizeScan({
      ...base,
      issues: [
        contrast({ brandModes: [{ brand: 'Bridge', pass: false, ratio: 2 }, { brand: 'Ikea', pass: true, ratio: 7 }] }),
        contrast({ nodeId: 'c2', brandModes: [{ brand: 'Bridge', pass: false, ratio: 3 }, { brand: 'Ikea', pass: false, ratio: 3 }] }),
      ],
    })
    expect(s.brands).toEqual([{ brand: 'Bridge', failing: 2 }, { brand: 'Ikea', failing: 1 }])
  })
})
