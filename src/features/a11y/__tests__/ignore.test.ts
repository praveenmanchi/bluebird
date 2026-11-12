import { describe, it, expect } from 'vitest'
import { contrastIgnoreKey, findIgnore, nonTextIgnoreKey, parseIgnores, seedIgnored, targetIgnoreKey, withIgnore, withoutIgnore } from '../ignore'
import { confidenceLine, contrastConfidence, nonTextConfidence, targetConfidence } from '../confidence'
import type { ContrastIssue, NonTextIssue, TargetSizeIssue } from '../messages'

const contrast = (over: Partial<ContrastIssue> = {}): ContrastIssue => ({
  nodeId: '1', nodeIds: ['1'], occurrences: 1, name: 'Caption', text: 'Hi', fontSize: 12, isBold: false,
  foreground: '#a1a1aa', background: '#ffffff', ratio: 2.5, level: 'fail', ...over,
})
const nonText: NonTextIssue = { nodeId: 's', nodeIds: ['s'], occurrences: 1, name: 'Border', foreground: '#eeeeee', background: '#ffffff', ratio: 1.2 }
const target: TargetSizeIssue = { nodeId: 't', nodeIds: ['t'], occurrences: 1, name: 'Close', width: 16, height: 16, required: 24, evidence: 'control' }

describe('ignore keys', () => {
  it('covers every layer that shares a colour pair at a size, and nothing else', () => {
    expect(contrastIgnoreKey(contrast())).toBe(contrastIgnoreKey(contrast({ nodeId: '9', name: 'Other' })))
    expect(contrastIgnoreKey(contrast())).not.toBe(contrastIgnoreKey(contrast({ fontSize: 20 })))
    expect(contrastIgnoreKey(contrast())).not.toBe(contrastIgnoreKey(contrast({ background: '#eeeeee' })))
  })

  it('keys a target on its layer as well as its size: one small icon says nothing about the next', () => {
    expect(targetIgnoreKey(target)).not.toBe(targetIgnoreKey({ ...target, nodeId: 'u' }))
    expect(nonTextIgnoreKey(nonText)).toBe('nontext:#eeeeee|#ffffff')
  })
})

describe('the ignore list', () => {
  it('adds, replaces and removes without mutating', () => {
    const first = withIgnore([], 'a', '2026-11-12T00:00:00.000Z')
    const again = withIgnore(first, 'a', '2026-11-13T00:00:00.000Z')
    expect(first[0]?.at).toBe('2026-11-12T00:00:00.000Z')
    expect(again).toHaveLength(1)
    expect(again[0]?.at).toBe('2026-11-13T00:00:00.000Z')
    expect(withoutIgnore(again, 'a')).toEqual([])
    expect(findIgnore(again, 'a')?.key).toBe('a')
  })

  it('survives anything the document hands back', () => {
    expect(parseIgnores('')).toEqual([])
    expect(parseIgnores('not json')).toEqual([])
    expect(parseIgnores('{"key":"a"}')).toEqual([])
    expect(parseIgnores('[{"key":"a","at":"x"},{"key":""},{"nope":1}]')).toEqual([{ key: 'a', at: 'x' }])
  })

  it('seeds the tab from what the scan came back with', () => {
    const seeded = seedIgnored({
      issues: [contrast({ ignored: { at: 'i' } }), contrast({ nodeId: '2', fontSize: 20 })],
      nonText: [{ ...nonText, ignored: { at: 'n' } }],
      targets: [target],
    })
    expect(seeded).toEqual({ [contrastIgnoreKey(contrast())]: 'i', [nonTextIgnoreKey(nonText)]: 'n' })
  })
})

describe('confidence', () => {
  it('separates a measurement from a guess', () => {
    expect(contrastConfidence(contrast())).toBe('measured')
    expect(contrastConfidence(contrast({ assumedBackground: true }))).toBe('assumed')
    expect(nonTextConfidence({ evidence: 'reaction' })).toBe('measured')
    expect(nonTextConfidence({ evidence: 'name' })).toBe('inferred')
    expect(nonTextConfidence({})).toBe('inferred')
    expect(targetConfidence(target)).toBe('inferred')
    expect(targetConfidence({ ...target, evidence: 'reaction' })).toBe('measured')
  })

  it('explains itself only where there is something to explain', () => {
    expect(confidenceLine('measured')).toBe('Measured')
    expect(confidenceLine('inferred')).toMatch(/^Inferred from the layer name — /)
    expect(confidenceLine('assumed')).toMatch(/^Measured against an assumed background — /)
  })
})
