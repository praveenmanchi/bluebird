import { describe, it, expect } from 'vitest'
import { generate, readInputs, derivedDeclarations, derivedLayerCollisions, assertNoCollisions, normalizeSvg, normalizeUiSvg, uiIconTones, minifyPathData } from '../../scripts/gen-tokens'
import { cssValueFor, cssVarName, brandIdFromMode, parseVariantName } from '../../src/shared/brand/snapshot'
import type { ComponentsSnapshot } from '../../src/shared/brand/snapshot'

interface FixtureLayer { id: string; name: string; fill?: string; size?: [number, number] }

/** A one-set snapshot: each variant is a bare root with VECTOR children. */
function logoFixture(variants: { name: string; layers: FixtureLayer[] }[]): ComponentsSnapshot {
  return {
    fileKey: 'test', page: { id: '0:1', name: 'Components' }, pulledAt: '2026-09-27', coverage: [],
    sets: [{
      code: 'Logo', id: '9:9', name: 'Logo', description: '', props: {}, status: 'built',
      variants: variants.map((v, i) => ({
        id: `9:${i}`, name: v.name, props: {},
        nodes: [
          { id: `9:${i}`, p: v.name, t: 'COMPONENT', b: {} },
          ...v.layers.map((l) => ({ id: l.id, p: `${v.name}/${l.name}`, t: 'VECTOR', b: {}, r: { ...(l.fill && { fill: l.fill }), ...(l.size && { size: l.size }) } })),
        ],
      })),
    }],
  } as ComponentsSnapshot
}

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
    expect(files['src/shared/brand/generated/brand.ikea.css']).toContain('--bb-button-primary-bg-default: #161616;')
    expect(files['src/shared/brand/generated/brand.ikea.css']).toContain('--bb-button-primary-radius: 64px;')
    expect(files['src/shared/brand/generated/brand.richemont.css']).toContain('--bb-button-primary-radius: 0px;')
    expect(files['src/shared/brand/generated/brand.fiskars.css']).toContain('[data-brand="fiskars"]')
  })
  it('keeps primitives on :root and emits semantics per brand mode', () => {
    const base = files['src/shared/brand/generated/base.css']!
    expect(base).toContain(':root {')
    expect(base).toContain('--bb-bridge-color-primary-400-brand: #0c8ce9;')
    expect(base).not.toContain('--bb-surface-canvas')
    expect(files['src/shared/brand/generated/brand.bridge.css']).toContain('--bb-surface-canvas: #151515;')
    expect(files['src/shared/brand/generated/brand.ikea.css']).toContain('--bb-surface-canvas: #ffffff;')
    expect(files['src/shared/brand/generated/brand.richemont.css']).toContain('--bb-font-family-display: "Noto Serif";')
  })
  it('promotes raw Figma values to derived tokens', () => {
    const derived = files['src/shared/brand/generated/derived.css']!
    expect(derived).toContain('--bb-derived-button-disabled-opacity: 0.55;')
    expect(derived).toContain('--bb-derived-checkbox-disabled-opacity: 0.6;')
    expect(derived).toContain('--bb-derived-menu-item-disabled-opacity: 0.5;')
    expect(derived).toContain('--bb-derived-checkbox-vector-width: 10.7px;')
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
    clash.tokens.collections[1]!.variables.push({ name: 'bridge/color/neutral/0', type: 'COLOR', values: { Bridge: '#fff' } })
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
  it('keeps every value when two layers in one variant share a name', () => {
    // Mirrors BrandLogo Brand=ikea (40000064:9864): an oval and a wordmark, both named "Vector".
    const components = logoFixture([
      { name: 'Brand=a', layers: [{ id: '1:1', name: 'Vector', fill: '#111111', size: [10, 5] }] },
      { name: 'Brand=b', layers: [
        { id: '2:1', name: 'Vector', fill: '#f6d33c', size: [106.3, 35] },
        { id: '2:2', name: 'Vector', fill: '#2360a5', size: [82.1, 14.6] },
      ] },
    ])
    const derived = Object.fromEntries(derivedDeclarations(components).map((d) => [d.name, d.value]))
    // Names that existed before keep the value they always had (the later layer wins them).
    expect(derived['--bb-derived-logo-vector-brand-a-fill']).toBe('#111111')
    expect(derived['--bb-derived-logo-vector-brand-b-fill']).toBe('#2360a5')
    expect(derived['--bb-derived-logo-vector-brand-b-width']).toBe('82.1px')
    // The earlier layer used to be dropped; it now gets an occurrence-indexed name.
    expect(derived['--bb-derived-logo-vector--1-fill']).toBe('#f6d33c')
    expect(derived['--bb-derived-logo-vector--1-width']).toBe('106.3px')
    expect(derived['--bb-derived-logo-vector--1-height']).toBe('35px')
    expect(derivedLayerCollisions(components)).toEqual([{
      set: 'Logo', variant: 'Brand=b', layer: 'Vector', nodes: ['2:1', '2:2'],
      tokens: ['--bb-derived-logo-vector--1-fill', '--bb-derived-logo-vector--1-height', '--bb-derived-logo-vector--1-width'],
    }])
  })
  it('reads the weight from numeric style names as well as named ones', () => {
    // Museo Sans names its styles by weight ("100", "300"); MuseoModerno uses words ("ExtraBold").
    const text = (id: string, name: string, font: string, style: string) => ({ id, p: `Card/${name}`, t: 'TEXT', b: {}, r: { fill: '#000000', fontSize: 12, font, style } })
    const components = {
      fileKey: 'test', page: { id: '0:1', name: 'Components' }, pulledAt: '2026-10-11', coverage: [],
      sets: [{
        code: 'Card', id: '8:8', name: 'Card', description: '', props: {}, status: 'built',
        variants: [{ id: '8:8', name: 'Card', props: {}, nodes: [
          { id: '8:8', p: 'Card', t: 'COMPONENT', b: {} },
          text('8:1', 'Light', 'Museo Sans', '300'),
          text('8:2', 'Thin', 'Museo Sans', '100'),
          text('8:3', 'Heavy', 'MuseoModerno', 'ExtraBold'),
          text('8:4', 'Odd', 'Museo Sans', '1000'),
        ] }],
      }],
    } as ComponentsSnapshot
    const derived = Object.fromEntries(derivedDeclarations(components).map((d) => [d.name, d.value]))
    expect(derived['--bb-derived-card-light-font-family']).toBe('"Museo Sans"')
    expect(derived['--bb-derived-card-light-font-weight']).toBe('300')
    expect(derived['--bb-derived-card-thin-font-weight']).toBe('100')
    expect(derived['--bb-derived-card-heavy-font-weight']).toBe('800')
    // Only the CSS weight range 100–900 counts; anything else is not a weight.
    expect(derived['--bb-derived-card-odd-font-weight']).toBeUndefined()
  })
  it('adds nothing for same-named layers whose values agree', () => {
    const components = logoFixture([{ name: 'Brand=a', layers: [
      { id: '1:1', name: 'Dot', fill: '#111111', size: [4, 4] },
      { id: '1:2', name: 'Dot', fill: '#111111', size: [4, 4] },
    ] }])
    expect(derivedDeclarations(components).map((d) => d.name)).toEqual([
      '--bb-derived-logo-dot-fill', '--bb-derived-logo-dot-height', '--bb-derived-logo-dot-width',
    ])
    expect(derivedLayerCollisions(components)).toEqual([])
  })
  it('never lets a disambiguated name clash with a real layer name', () => {
    // Figma auto-names like "Vector 1" slug to `vector-1`; the `--` marker cannot come from a layer name.
    const components = logoFixture([{ name: 'Brand=a', layers: [
      { id: '1:1', name: 'Vector', fill: '#aaaaaa', size: [1, 1] },
      { id: '1:2', name: 'Vector', fill: '#bbbbbb', size: [1, 1] },
      { id: '1:3', name: 'Vector 1', fill: '#cccccc', size: [1, 1] },
    ] }])
    const derived = Object.fromEntries(derivedDeclarations(components).map((d) => [d.name, d.value]))
    expect(derived['--bb-derived-logo-vector-1-fill']).toBe('#cccccc')
    expect(derived['--bb-derived-logo-vector-brand-a-fill']).toBe('#bbbbbb')
    expect(derived['--bb-derived-logo-vector--1-fill']).toBe('#aaaaaa')
  })
  it('numbers only the same-named layers that carry raw values', () => {
    // A fully variable-bound layer produces no derived token, so it does not shift `--<n>`: `vector--1` is nodes[0].
    const components = logoFixture([{ name: 'Brand=a', layers: [
      { id: '1:1', name: 'Vector' },
      { id: '1:2', name: 'Vector', fill: '#aaaaaa' },
      { id: '1:3', name: 'Vector', fill: '#bbbbbb' },
    ] }])
    const derived = Object.fromEntries(derivedDeclarations(components).map((d) => [d.name, d.value]))
    expect(derived['--bb-derived-logo-vector--1-fill']).toBe('#aaaaaa')
    expect(derivedLayerCollisions(components)[0]?.nodes).toEqual(['1:2', '1:3'])
  })
  it('normalises svg exports to currentColor bodies', () => {
    const { viewBox, body } = normalizeSvg('<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M1 1" fill="#F5F5F5"/>\n<rect stroke="white"/></svg>')
    expect(viewBox).toBe('0 0 24 24')
    expect(body).toBe('<path d="M1 1" fill="currentColor"/><rect stroke="currentColor"/>')
  })
  it('maps UI icon colours back to the tokens they are bound to', () => {
    const tones = { '#f7f7f7': 'currentColor', '#757575': 'var(--bb-icon-glyph-muted)' }
    const { body } = normalizeUiSvg('<svg viewBox="0 0 24 24"><path d="M1 1" fill="#F7F7F7"/><path stroke="#757575"/><path fill="#F24822"/><mask><rect fill="white"/></mask></svg>', tones)
    expect(body).toBe('<path d="M1 1" fill="currentColor"/><path style="stroke:var(--bb-icon-glyph-muted)"/><path fill="#F24822"/><mask><rect fill="white"/></mask>')
  })
  it('rounds UI icon path data to one decimal and minifies it', () => {
    expect(normalizeUiSvg('<svg viewBox="0 0 24 24"><path d="M1.234 5.678L-0.051 2"/></svg>', {}).body).toBe('<path d="M1.2 5.7L-.1 2"/>')
  })
  it('minifies path numbers without touching values', () => {
    expect(minifyPathData('<path d="M0.5 10.5L1 -2.25 -0.5 0"/>')).toBe('<path d="M.5 10.5L1-2.25-.5 0"/>')
  })
  it('keeps every colour of a raw UI icon set (app marks)', () => {
    const { body } = normalizeUiSvg('<svg viewBox="0 0 16 16"><path fill="#0D99FF"/></svg>', { '#0d99ff': 'currentColor' }, true)
    expect(body).toBe('<path fill="#0D99FF"/>')
  })
  it('derives UI icon tones from the Brand UI default mode of the committed tokens', () => {
    const tones = uiIconTones(readInputs().tokens)
    expect(Object.values(tones)).toContain('currentColor')
    expect(Object.values(tones)).toContain('var(--bb-surface-canvas)')
    expect(Object.keys(tones)).toHaveLength(4)
  })
})
