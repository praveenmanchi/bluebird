// Token data for the style-guide pages, read from the generated CSS so the site
// can never drift from what the plugin ships. Re-run `npm run gen:tokens` and the
// pages follow.
import baseCss from '../../src/shared/brand/generated/base.css?raw'
import bridgeCss from '../../src/shared/brand/generated/brand.bridge.css?raw'
import ikeaCss from '../../src/shared/brand/generated/brand.ikea.css?raw'
import richemontCss from '../../src/shared/brand/generated/brand.richemont.css?raw'
import disneyCss from '../../src/shared/brand/generated/brand.disney.css?raw'
import fiskarsCss from '../../src/shared/brand/generated/brand.fiskars.css?raw'
import { BRANDS, type BrandId } from '../../src/shared/brand/generated/tokens'

export interface TokenVar { name: string; value: string }

const DECLARATION = /(--bb-[a-z0-9-]+)\s*:\s*([^;]+);/g

/** Custom properties in source order; a repeated name keeps its last value, as CSS does. */
export function parseVars(css: string): TokenVar[] {
  const byName = new Map<string, string>()
  for (const match of css.matchAll(DECLARATION)) {
    const [, name, value] = match
    if (name && value) byName.set(name, value.trim())
  }
  return [...byName].map(([name, value]) => ({ name, value }))
}

/** Foundations + Semantics: one :root block shared by every brand. */
export const BASE_VARS = parseVars(baseCss)

/** Brand UI collection, one list per mode. */
export const BRAND_VARS: Record<BrandId, TokenVar[]> = {
  bridge: parseVars(bridgeCss),
  ikea: parseVars(ikeaCss),
  richemont: parseVars(richemontCss),
  disney: parseVars(disneyCss),
  fiskars: parseVars(fiskarsCss),
}

const baseIndex = new Map(BASE_VARS.map((v) => [v.name, v.value]))
const brandIndex = Object.fromEntries(
  BRANDS.map((brand) => [brand, new Map(BRAND_VARS[brand].map((v) => [v.name, v.value]))]),
) as Record<BrandId, Map<string, string>>

/** Declared value of a token for a brand (Brand UI first, then the shared base). */
export function valueOf(name: string, brand: BrandId): string {
  return brandIndex[brand].get(name) ?? baseIndex.get(name) ?? ''
}

export const isColour = (value: string) => /^#[0-9a-f]{3,8}$/i.test(value)

export function withPrefix(vars: TokenVar[], prefix: string): TokenVar[] {
  return vars.filter((v) => v.name.startsWith(prefix))
}

/** Last numeric-ish segment(s) of a token, used as the visible step label. */
export function stepLabel(name: string, prefix: string): string {
  return name.slice(prefix.length).replace(/^-/, '')
}

// ── Semantic colour roles (Brand UI tier 1) ────────────────────────────────
export interface ColourRole { id: string; label: string; description: string; match: RegExp }

export const COLOUR_ROLES: ColourRole[] = [
  { id: 'surface', label: 'Surface', description: 'Backgrounds for canvases, panels, fields and accent fills.', match: /^--bb-(background|surface-[a-z-]+)$/ },
  { id: 'text', label: 'Text', description: 'Foreground colours for copy, from primary through placeholder.', match: /^--bb-text-[a-z-]+$/ },
  { id: 'border', label: 'Border', description: 'Strokes, dividers and the focus ring.', match: /^--bb-border-(?!width)[a-z-]+$/ },
  { id: 'icon', label: 'Icon', description: 'Glyph colours. Components read these through icon/glyph/*.', match: /^--bb-icon-(default|muted|on-accent)$/ },
  { id: 'feedback', label: 'Feedback', description: 'Status colours for success, warning and danger states.', match: /^--bb-feedback-[a-z]+$/ },
  { id: 'a11y', label: 'Accessibility', description: 'Accent used by the accessibility tab for highlights.', match: /^--bb-a11y-accent[a-z-]*$/ },
]

/** Tier 1 colour tokens for a role, in Figma order. Every brand mode defines the same names. */
export function roleTokens(role: ColourRole): string[] {
  return BRAND_VARS.bridge.filter((v) => role.match.test(v.name) && isColour(v.value)).map((v) => v.name)
}

// ── Primitive palettes (Foundations, one namespace per brand) ──────────────
export interface Ramp { family: string; steps: TokenVar[] }

/** `--bb-<brand>-color-<family>-<step>` grouped into ramps, brand anchors first. */
export function brandRamps(brand: BrandId): Ramp[] {
  const prefix = `--bb-${brand}-color-`
  const ramps = new Map<string, TokenVar[]>()
  for (const v of withPrefix(BASE_VARS, prefix)) {
    const rest = v.name.slice(prefix.length)
    const family = rest.startsWith('brand-') ? 'brand' : rest.replace(/-\d+(-brand)?$/, '')
    ramps.set(family, [...(ramps.get(family) ?? []), v])
  }
  return [...ramps].map(([family, steps]) => ({ family, steps }))
}

export const familyLabel = (family: string) =>
  family === 'brand' ? 'Brand anchors' : family.replace(/^status-/, 'Status · ').replace(/^\w/, (c) => c.toUpperCase())

/** Readable token name without the `--bb-` namespace. */
export const shortName = (name: string) => name.replace(/^--bb-/, '')

/** Strip CSS quotes from a font-family value. */
export const fontName = (value: string) => value.replace(/["']/g, '')
