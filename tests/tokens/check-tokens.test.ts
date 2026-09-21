import { describe, it, expect } from 'vitest'
import { findRawValues, findUnknownVars, runChecks } from '../../scripts/check-tokens'

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

describe('repository drift gate', () => {
  it('code matches figma/*.json (generated files fresh, every Figma binding consumed, no raw values)', async () => {
    const findings = await runChecks()
    expect(findings.map((f) => `${f.rule} ${f.file}${f.line ? `:${f.line}` : ''} ${f.message}`)).toEqual([])
  }, 30_000)
})
