import { describe, expect, it } from 'vitest'
import { checkLayering } from '../scripts/check-tokens'
import type { TokenSnapshot } from '../src/shared/brand/snapshot'

function snapshot(overrides: Partial<Record<'Semantics' | 'Brand UI', Partial<TokenSnapshot['collections'][number]>>> = {}): TokenSnapshot {
  const base = (name: string, key: string, modes: string[]): TokenSnapshot['collections'][number] => ({ name, key, modes, defaultMode: modes[0]!, variables: [] })
  return {
    fileKey: 'f', fileName: 'f', pulledAt: '', source: 'test',
    collections: [
      base('Foundations', 'primitives', ['Value']),
      { ...base('Semantics', 'semantics', ['Value']), ...overrides.Semantics },
      { ...base('Brand UI', 'brand', ['Bridge', 'Ikea']), ...overrides['Brand UI'] },
    ],
  }
}

describe('checkLayering', () => {
  it('accepts single-mode Semantics aliasing Foundations and Brand UI aliasing any local collection', () => {
    const findings = checkLayering(snapshot({
      Semantics: { variables: [{ name: 'radius/md', type: 'FLOAT', values: { Value: 8 }, aliases: { Value: 'Foundations/dimension/8' } }] },
      'Brand UI': { variables: [
        { name: 'text/primary', type: 'COLOR', values: { Bridge: '#fff', Ikea: '#111' }, aliases: { Bridge: 'Foundations/bridge/color/neutral/0', Ikea: 'Foundations/ikea/color/neutral/1000' } },
        { name: 'button/primary/fg', type: 'COLOR', values: { Bridge: '#fff', Ikea: '#111' }, aliases: { Bridge: 'Brand UI/text/primary', Ikea: 'Brand UI/text/primary' } },
        { name: 'button/radius', type: 'FLOAT', values: { Bridge: 8, Ikea: 8 }, aliases: { Bridge: 'Semantics/radius/md', Ikea: 'Semantics/radius/md' } },
      ] },
    }))
    expect(findings).toEqual([])
  })

  it('flags a second Semantics mode', () => {
    const findings = checkLayering(snapshot({ Semantics: { modes: ['Bridge', 'Ikea'], defaultMode: 'Bridge' } }))
    expect(findings.map((f) => f.rule)).toEqual(['semantics-multi-mode'])
  })

  it('flags a Semantics token that aliases Brand UI', () => {
    const findings = checkLayering(snapshot({
      Semantics: { variables: [{ name: 'surface/canvas', type: 'COLOR', values: { Value: '#000' }, aliases: { Value: 'Brand UI/surface/canvas' } }] },
    }))
    expect(findings.map((f) => f.rule)).toEqual(['semantics-alias-layer'])
  })

  it('flags a Brand UI alias into an unknown collection', () => {
    const findings = checkLayering(snapshot({
      'Brand UI': { variables: [{ name: 'x', type: 'COLOR', values: { Bridge: '#000', Ikea: '#000' }, aliases: { Bridge: 'Legacy/x', Ikea: 'Legacy/x' } }] },
    }))
    expect(findings.map((f) => f.rule)).toEqual(['brand-ui-alias-layer', 'brand-ui-alias-layer'])
  })
})
