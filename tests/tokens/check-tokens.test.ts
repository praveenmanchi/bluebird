import { describe, it, expect } from 'vitest'
import { findRawValues, findUnknownVars, layerCollisionWarnings, runChecks } from '../../scripts/check-tokens'
import type { ComponentsSnapshot } from '../../src/shared/brand/snapshot'

describe('check-tokens rules', () => {
  it('flags hardcoded visual values in component css', () => {
    const css = [
      '.a { color: #ffffff; }',
      '.b { width: 12px; }',
      '.c { background: rgb(1,2,3); }',
      '.d { color: white; }',
      '.ok { width: var(--bb-x); border: 0px; }',
      '.motion { transition: opacity 120ms ease; } /* allow-raw: motion */',
    ].join('\n')
    const rules = findRawValues(css, 'x.css').map((f) => `${f.line}:${f.message.split(' in ')[0]}`)
    expect(rules).toEqual(['1:hex colour', '2:px length', '3:rgb/hsl colour', '4:named colour'])
  })
  it('flags css variables that are not generated tokens', () => {
    const findings = findUnknownVars('a{color:var(--bb-nope)} b{color:var(--bb-known)}', 'x.css', new Set(['--bb-known']))
    expect(findings.map((f) => f.message)).toEqual(['--bb-nope is not a generated token'])
  })
})

describe('layer collision warnings', () => {
  it('names the same-named layers to rename and the position-indexed tokens they needed', () => {
    const vector = (id: string, fill: string) => ({ id, p: `Brand=ikea/Vector`, t: 'VECTOR', b: {}, r: { fill } })
    const components = {
      fileKey: 'test', page: { id: '0:1', name: 'Components' }, pulledAt: '2026-09-27', coverage: [],
      sets: [{
        code: 'BrandLogo', id: '9:9', name: 'brand logos', description: '', props: {}, status: 'built',
        variants: [{ id: '9:1', name: 'Brand=ikea', props: {}, nodes: [{ id: '9:1', p: 'Brand=ikea', t: 'COMPONENT', b: {} }, vector('1:1', '#f6d33c'), vector('1:2', '#2360a5')] }],
      }],
    } as ComponentsSnapshot
    expect(layerCollisionWarnings(components)).toEqual([
      'BrandLogo › Brand=ikea: 2 layers named "Vector" (1:1, 1:2) — 1 value(s) the shared name dropped are only reachable as --bb-derived-brand-logo-vector--1-*; give the layers distinct names in Figma',
    ])
  })
})

describe('repository drift gate', () => {
  it('code matches figma/*.json (generated files fresh, every Figma binding consumed, no raw values)', async () => {
    const findings = await runChecks()
    expect(findings.map((f) => `${f.rule} ${f.file}${f.line ? `:${f.line}` : ''} ${f.message}`)).toEqual([])
  }, 30_000)
})
