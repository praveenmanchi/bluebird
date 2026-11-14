// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { DeployError, findLeaks, otherBrands, resolveDeploy, singleBrandConfig, stripBrandCss, stripBrandCssInHtml, stripLogos, stripTokenBrands } from '../../tools/deploy/deploy'
import { ConfigError } from '../../src/shared/config/load'
import { hashAccessCode } from '../../src/shared/session'
import { rawConfig } from './fixture'

describe('resolveDeploy', () => {
  it('reads plugin.config.json › deploy, multi-brand when it is absent', () => {
    expect(resolveDeploy(rawConfig())).toEqual({ mode: 'multi' })
    expect(resolveDeploy(rawConfig({ mode: 'single', brand: 'gap' }))).toEqual({ mode: 'single', brand: 'gap' })
  })

  it('lets BB_DEPLOY pick one brand or force multi-brand for one build', () => {
    expect(resolveDeploy(rawConfig(), { BB_DEPLOY: ' GAP ' })).toEqual({ mode: 'single', brand: 'gap' })
    expect(resolveDeploy(rawConfig({ mode: 'single', brand: 'gap' }), { BB_DEPLOY: 'multi' })).toEqual({ mode: 'multi' })
    expect(resolveDeploy(rawConfig(), { BB_DEPLOY: '' })).toEqual({ mode: 'multi' })
  })

  it('names the brands it knows when BB_DEPLOY is misspelt', () => {
    expect(() => resolveDeploy(rawConfig(), { BB_DEPLOY: 'gapp' })).toThrow(DeployError)
    expect(() => resolveDeploy(rawConfig(), { BB_DEPLOY: 'gapp' })).toThrow(/bridge, ikea, gap/)
  })

  it('refuses a single-brand config without a known brand', () => {
    expect(() => resolveDeploy(rawConfig({ mode: 'single' }))).toThrow(/deploy.brand is not set/)
    expect(() => resolveDeploy(rawConfig({ mode: 'single', brand: 'nike' }))).toThrow(/"nike" is not defined/)
  })
})

describe('singleBrandConfig', () => {
  it('keeps one brand, active, with no access code hash or plugin block', () => {
    const next = singleBrandConfig(rawConfig(), 'gap')
    expect(next.brand).toEqual({ active: 'gap', brands: { gap: { label: 'Gap Inc.', source: { collection: 'Brand UI', mode: 'Gap' } } } })
    expect(next.deploy).toEqual({ mode: 'single', brand: 'gap' })
    expect(next.personas).toEqual(rawConfig().personas)
  })

  it('leaves the source untouched and refuses an unknown brand', () => {
    const source = rawConfig()
    singleBrandConfig(source, 'gap')
    expect(source.brand.brands.gap.accessCodeHash).toBe(hashAccessCode('GAP'))
    expect(() => singleBrandConfig(source, 'nike')).toThrow(DeployError)
  })

  it('lists the brands a build for one brand leaves out', () => {
    expect(otherBrands(rawConfig(), 'gap')).toEqual(['bridge', 'ikea'])
  })
})

describe('source rewrites', () => {
  it('drops other brands’ logos and keeps brand-independent artwork', () => {
    const source = ['export const LOGOS = {', '  "bridge": { viewBox: "0 0 1 1", body: "b" },', '  "fabric": { viewBox: "0 0 1 1", body: "f" },', '  "gap": { viewBox: "0 0 1 1", body: "g" },', '  "ikea": { viewBox: "0 0 1 1", body: "i" },', '} as const'].join('\n')
    expect(stripLogos(source, ['bridge', 'ikea'])).toBe(['export const LOGOS = {', '  "fabric": { viewBox: "0 0 1 1", body: "f" },', '  "gap": { viewBox: "0 0 1 1", body: "g" },', '} as const'].join('\n'))
  })

  it('trims BRANDS and BRAND_LABELS only', () => {
    const source = ['export const BRANDS = [', '  "bridge",', '  "gap",', '] as const', 'export const BRAND_LABELS: Record<BrandId, string> = {', '  bridge: "Bridge",', '  gap: "Gap",', '}', 'export const TOKEN_NAMES = [', '  "bridge",', ']'].join('\n')
    expect(stripTokenBrands(source, ['bridge'])).toBe(['export const BRANDS = [', '  "gap",', '] as const', 'export const BRAND_LABELS: Record<BrandId, string> = {', '  gap: "Gap",', '}', 'export const TOKEN_NAMES = [', '  "bridge",', ']'].join('\n'))
  })
})

describe('stripBrandCss', () => {
  it('removes rules scoped to other brands, quoted or not, inside @media too', () => {
    const css = ':root{--a:1}[data-brand=ikea]{--b:2}[data-brand="gap"]{--b:3}@media (min-width:1px){[data-brand=\'ikea\'] .x{color:red}.y{color:blue}}'
    expect(stripBrandCss(css, ['ikea'])).toBe(':root{--a:1}[data-brand="gap"]{--b:3}@media (min-width:1px){.y{color:blue}}')
  })

  it('keeps the other selectors in a shared rule', () => {
    expect(stripBrandCss('[data-brand=ikea],[data-brand=gap],:is(.a, .b){--x:1}', ['ikea'])).toBe('[data-brand=gap],:is(.a, .b){--x:1}')
  })

  it('leaves the CSS alone with nothing to strip', () => {
    expect(stripBrandCss('[data-brand=ikea]{--x:1}', [])).toBe('[data-brand=ikea]{--x:1}')
  })

  it('touches style blocks in a page, never its scripts', () => {
    const html = '<style>[data-brand=ikea]{--x:1}.a{--y:2}</style><script>const s="[data-brand=ikea]{--x:1}"</script>'
    expect(stripBrandCssInHtml(html, ['ikea'])).toBe('<style>.a{--y:2}</style><script>const s="[data-brand=ikea]{--x:1}"</script>')
  })
})

describe('findLeaks', () => {
  it('blocks hashes, brand CSS and logos, and only warns about names', () => {
    const bundle = `${hashAccessCode('GAP')} [data-brand=ikea]{} "bridge": { viewBox: "0 0 1 1" } label:"Ikea"`
    expect(findLeaks(bundle, rawConfig(), 'gap')).toEqual([
      { brand: 'bridge', what: 'logo artwork', severity: 'blocking' },
      { brand: 'ikea', what: 'brand-scoped CSS', severity: 'blocking' },
      { brand: 'ikea', what: 'its name ("Ikea") in sample data', severity: 'warning' },
      { brand: 'gap', what: 'access code hash', severity: 'blocking' },
    ])
  })

  it('finds nothing in a clean build', () => {
    expect(findLeaks('[data-brand=gap]{--x:1} label:"Gap Inc."', rawConfig(), 'gap')).toEqual([])
  })

  it('validates the config it is given', () => {
    expect(() => findLeaks('', { brand: {} }, 'gap')).toThrow(ConfigError)
  })
})
