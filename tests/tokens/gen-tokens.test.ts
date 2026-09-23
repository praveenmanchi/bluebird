import { describe, it, expect } from 'vitest'
import { generate, readInputs, derivedDeclarations, assertNoCollisions, normalizeSvg } from '../../scripts/gen-tokens'
import { cssValueFor, cssVarName, brandIdFromMode, parseVariantName } from '../../src/shared/brand/snapshot'

describe('snapshot helpers', () => {
  it('names css variables from Figma variable names', () => {
    expect(cssVarName('button/primary/bg/default')).toBe('--bb-button-primary-bg-default')
    expect(cssVarName('Radius / MD')).toBe('--bb-radius-md')
  })
  it('formats values by type and role', () => {
    expect(cssValueFor('button/primary/bg/default', 'COLOR', '#0c8ce9')).toBe('#0c8ce9')
    expect(cssValueFor('button/primary/height', 'FLOAT', 32)).toBe('32px')
    expect(cssValueFor('button/primary/font/weight', 'FLOAT', 600)).toBe('600')
    expect(cssValueFor('font/weight-medium', 'FLOAT', 500)).toBe('500')
    expect(cssValueFor('font/line-body', 'FLOAT', 15.399999618530273)).toBe('15.4px')
    expect(cssValueFor('button/primary/font/family', 'STRING', 'Noto Sans')).toBe('"Noto Sans"')
    expect(cssValueFor('flag', 'BOOLEAN', true)).toBe('true')
    expect(cssValueFor('x', 'COLOR', null)).toBeNull()
    expect(cssValueFor('x', 'FLOAT', 'nope')).toBeNull()
  })
  it('derives brand ids and parses variant names', () => {
    expect(brandIdFromMode('Richemont')).toBe('richemont')
    expect(parseVariantName('Type=Primary, State=Default')).toEqual({ Type: 'Primary', State: 'Default' })
  })
})

describe('generate()', () => {
  const inputs = readInputs()
  const files = generate(inputs)

  it('emits base, derived, one css file per brand, all/active bundles, tokens.ts and icons', () => {
    const names = Object.keys(files)
    expect(names).toEqual(expect.arrayContaining([
      'src/shared/brand/generated/base.css',
      'src/shared/brand/generated/derived.css',
      'src/shared/brand/generated/brand.bridge.css',
      'src/shared/brand/generated/brand.ikea.css',
      'src/shared/brand/generated/brand.richemont.css',
      'src/shared/brand/generated/brand.disney.css',
      'src/shared/brand/generated/brand.fiskars.css',
      'src/shared/brand/generated/all.css',
      'src/shared/brand/generated/active.css',
      'src/shared/brand/generated/tokens.ts',
      'src/shared/ui/Icon/generated.ts',
    ]))
  })
  it('resolves brand values per mode', () => {
    expect(files['src/shared/brand/generated/brand.bridge.css']).toContain('--bb-button-primary-bg-default: #0c8ce9;')
    expect(files['src/shared/brand/generated/brand.ikea.css']).toContain('--bb-button-primary-bg-default: #111111;')
    expect(files['src/shared/brand/generated/brand.ikea.css']).toContain('--bb-button-primary-radius: 64px;')
    expect(files['src/shared/brand/generated/brand.richemont.css']).toContain('--bb-button-primary-radius: 0px;')
    expect(files['src/shared/brand/generated/brand.fiskars.css']).toContain('[data-brand="fiskars"]')
  })
  it('keeps primitives and semantics brand-agnostic on :root', () => {
    const base = files['src/shared/brand/generated/base.css']!
    expect(base).toContain(':root {')
    expect(base).toContain('--bb-surface-canvas: #151515;')
    expect(base).toContain('--bb-font-family-ui: "Noto Sans";')
  })
  it('promotes raw Figma values to derived tokens', () => {
    const derived = files['src/shared/brand/generated/derived.css']!
    expect(derived).toContain('--bb-derived-button-disabled-opacity: 0.55;')
    expect(derived).toContain('--bb-derived-checkbox-disabled-opacity: 0.6;')
    expect(derived).toContain('--bb-derived-menu-item-disabled-opacity: 0.5;')
    expect(derived).toContain('--bb-derived-checkbox-check-stroke-width: 2px;')
    expect(derived).toContain('--bb-derived-checkbox-dash-radius: 1px;')
  })
  it('lists per-component Figma bindings in tokens.ts', () => {
    const ts = files['src/shared/brand/generated/tokens.ts']!
    expect(ts).toContain('export const BRANDS = [')
    expect(ts).toMatch(/Button: \[[\s\S]*"--bb-button-primary-bg-default"/)
    expect(ts).toContain('"40000040:5139"')
  })
  it('fails on colliding names and on an unknown active brand', () => {
    const clash = structuredClone(inputs)
    clash.tokens.collections[1]!.variables.push({ name: 'color/neutral/0', type: 'COLOR', values: { Value: '#fff' } })
    expect(() => assertNoCollisions(clash.tokens)).toThrow(/collision/)
    expect(() => generate({ ...inputs, activeBrand: 'acme' })).toThrow(/not a Brand mode/)
  })
  it('derivedDeclarations is deterministic and skips instance internals', () => {
    const a = derivedDeclarations(inputs.components).map((d) => d.name)
    const b = derivedDeclarations(inputs.components).map((d) => d.name)
    expect(a).toEqual(b)
    // The Button's icon vector lives inside an instance and must not leak; a set's own vector does.
    // (This used to assert on the Banner's HCLTech mark, but Figma replaced that inline vector with a
    // `brand logos` instance on 2026-09-23, so the Banner no longer owns a vector.)
    expect(a.some((n) => n.includes('leading-icon'))).toBe(false)
    expect(a).toContain('--bb-derived-settings-button-vector-width')
  })
  it('normalises svg exports to currentColor bodies', () => {
    const { viewBox, body } = normalizeSvg('<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M1 1" fill="#F5F5F5"/>\n<rect stroke="white"/></svg>')
    expect(viewBox).toBe('0 0 24 24')
    expect(body).toBe('<path d="M1 1" fill="currentColor"/><rect stroke="currentColor"/>')
  })
})
