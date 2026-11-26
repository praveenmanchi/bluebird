// Single-brand builds. A client that publishes Bluebird in its own Figma organisation gets a
// plugin that knows one brand: no access code, no other brands' names, logos, colours or code
// hashes. plugin.config.json stays the multi-brand source of truth; these helpers turn it into
// the one-brand copy the bundlers read, and strip the other brands from the generated files and
// the built CSS on the way through. Nothing here changes a file on disk.
import { loadConfig } from '../../src/shared/config/load'
import type { PluginConfig } from '../../src/shared/config/schema'

export type Deploy = { mode: 'multi' } | { mode: 'single'; brand: string }

/** `BB_DEPLOY=gap` builds Gap only; `BB_DEPLOY=multi` builds every brand, whatever the config says. */
export const DEPLOY_ENV = 'BB_DEPLOY'

export class DeployError extends Error {
  override readonly name = 'DeployError'
}

/** What this build ships: the BB_DEPLOY override when set, else plugin.config.json › deploy. */
export function resolveDeploy(raw: unknown, env: Readonly<Record<string, string | undefined>> = {}): Deploy {
  const config = loadConfig(raw)
  const override = env[DEPLOY_ENV]?.trim().toLowerCase()
  if (override) {
    if (override === 'multi') return { mode: 'multi' }
    if (!config.brand.brands[override]) {
      throw new DeployError(`${DEPLOY_ENV}=${override}: no such brand. Use "multi" or one of: ${Object.keys(config.brand.brands).join(', ')}`)
    }
    return { mode: 'single', brand: override }
  }
  return config.deploy.mode === 'single' && config.deploy.brand ? { mode: 'single', brand: config.deploy.brand } : { mode: 'multi' }
}

/** Every brand id the config knows except the one being kept. */
export function otherBrands(raw: unknown, keep: string): string[] {
  return Object.keys(loadConfig(raw).brand.brands).filter((id) => id !== keep)
}

type RawConfig = Record<string, unknown> & { brand: { brands: Record<string, Record<string, unknown>> } }

/**
 * The config a single-brand bundle is built from: that brand alone, marked active, with no access
 * code hash (nobody signs in) and no figmaPlugin block (the package step reads it from the source).
 * Personas, tabs and window carry over untouched. Validated like the source.
 */
export function singleBrandConfig(raw: unknown, brandId: string): PluginConfig & Record<string, unknown> {
  loadConfig(raw)
  const source = raw as RawConfig
  const brand = source.brand.brands[brandId]
  if (!brand) throw new DeployError(`Brand "${brandId}" isn’t in plugin.config.json.`)
  const kept = Object.fromEntries(Object.entries(brand).filter(([key]) => key !== 'accessCodeHash' && key !== 'figmaPlugin'))
  const next = { ...source, brand: { active: brandId, brands: { [brandId]: kept } }, deploy: { mode: 'single', brand: brandId } }
  loadConfig(next)
  return next as PluginConfig & Record<string, unknown>
}

const entryKey = (line: string): string | undefined => /^ {2}"?([a-z0-9-]+)"?\s*[:,]/.exec(line)?.[1]

/**
 * src/shared/ui/BrandLogo/generated.ts without the other brands' artwork. Each brand logo is one
 * `  "brand-<id>": { … },` line; brand-independent artwork (HCL, Fabric, integration logos) stays.
 */
export function stripLogos(source: string, others: readonly string[]): string {
  const drop = new Set(others.map((id) => `brand-${id}`))
  return source.split('\n').filter((line) => !drop.has(entryKey(line) ?? '')).join('\n')
}

/**
 * src/shared/brand/generated/tokens.ts with BRANDS and BRAND_LABELS listing the kept brand only.
 * Only lines inside those two literals are touched; token names that happen to contain a brand id stay.
 */
export function stripTokenBrands(source: string, others: readonly string[]): string {
  const drop = new Set(others)
  let inside = false
  return source.split('\n').filter((line) => {
    if (/^export const (BRANDS|BRAND_LABELS)\b/.test(line)) { inside = true; return true }
    if (inside && /^[}\]]/.test(line)) { inside = false; return true }
    return !(inside && drop.has(entryKey(line) ?? ''))
  }).join('\n')
}

const brandSelector = (others: readonly string[]): RegExp =>
  new RegExp(`\\[data-brand=(["']?)(${others.map((id) => id.replace(/[-]/g, '\\-')).join('|')})\\1\\]`)

/**
 * Built CSS without the rules scoped to other brands. Works on innermost rules (no nested braces),
 * so a rule inside @media is handled too. A selector list keeps the selectors that don't name
 * another brand; a rule left with none is removed.
 */
export function stripBrandCss(css: string, others: readonly string[]): string {
  if (!others.length) return css
  const other = brandSelector(others)
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors: string, body: string) => {
    if (!other.test(selectors)) return rule
    const lead = /^\s*/.exec(selectors)?.[0] ?? ''
    const kept = splitSelectors(selectors).filter((s) => !other.test(s))
    return kept.length ? `${lead}${kept.join(',')}{${body}}` : lead
  })
}

/** Top-level commas only: `:is(a, b)` stays one selector. */
function splitSelectors(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1 }
  }
  out.push(list.slice(start).trim())
  return out.filter(Boolean)
}

/** `<style>` blocks in a built HTML page run through stripBrandCss; scripts are left alone. */
export function stripBrandCssInHtml(html: string, others: readonly string[]): string {
  return html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open: string, css: string, close: string) => `${open}${stripBrandCss(css, others)}${close}`)
}

export interface Leak {
  brand: string
  what: string
  /** blocking: the build wasn't stripped (hashes, CSS, logos). warning: a name in sample or demo data. */
  severity: 'blocking' | 'warning'
}

/**
 * What a single-brand bundle still says about other brands. Access code hashes, logo artwork and
 * brand-scoped CSS mean the build wasn't stripped, and the package step refuses it. A brand's name
 * on its own is usually sample data in a demo screen or fixture: reported, not refused.
 */
export function findLeaks(bundle: string, raw: unknown, keep: string): Leak[] {
  const config = loadConfig(raw)
  const leaks: Leak[] = []
  for (const [id, b] of Object.entries(config.brand.brands)) {
    if (b.accessCodeHash && bundle.includes(b.accessCodeHash)) leaks.push({ brand: id, what: 'access code hash', severity: 'blocking' })
    if (id === keep) continue
    if (brandSelector([id]).test(bundle)) leaks.push({ brand: id, what: 'brand-scoped CSS', severity: 'blocking' })
    if (new RegExp(`"brand-${id}":\\s*\\{\\s*viewBox`).test(bundle)) leaks.push({ brand: id, what: 'logo artwork', severity: 'blocking' })
    if (new RegExp(`["'\`>]${escapeRegExp(b.label)}["'\`<]`).test(bundle)) leaks.push({ brand: id, what: `its name ("${b.label}") in sample data`, severity: 'warning' })
  }
  return leaks
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
