// Shapes shared by the Figma extractor (runs inside Figma), the pull script
// (REST or relay), the generator, and the drift checker. Pure types + pure
// helpers: no Figma or DOM access here so every consumer can unit-test them.
import { tokenKeyFromVariableName } from './tokens'

export type VariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
export type ResolvedValue = string | number | boolean | null

export interface SnapshotVariable {
  /** Figma's VariableID. Recorded so a REST pull can resolve node bindings to names when the
   *  file's plan denies /variables/local (Enterprise-only) — see scripts/figma-pull.ts. */
  id?: string
  name: string
  type: VariableType
  /** Resolved (alias-followed) value per mode name. */
  values: Record<string, ResolvedValue>
  /** First-hop alias per mode, "<collection>/<variable>", when the value is an alias. */
  aliases?: Record<string, string>
  /** Library publish key — stable across every file that subscribes to the library. */
  publishKey?: string
  description?: string
  /** Where Figma lets the variable be applied (ALL_FILLS, CORNER_RADIUS, …). */
  scopes?: string[]
  /** Per-platform code syntax set in Figma (WEB / ANDROID / iOS). */
  codeSyntax?: Record<string, string>
  hiddenFromPublishing?: boolean
}

export interface SnapshotCollection {
  /** Figma VariableCollectionId. */
  id?: string
  publishKey?: string
  name: string
  key: 'primitives' | 'semantics' | 'brand' | string
  modes: string[]
  defaultMode: string
  variables: SnapshotVariable[]
}

export interface TokenSnapshot {
  fileKey: string
  fileName: string
  pulledAt: string
  source: string
  /** Figma file version the snapshot was read from (REST only — the Plugin API does not expose it). */
  version?: string
  collections: SnapshotCollection[]
}

export interface ComponentNode {
  /** Figma node id. Stable across renames, so the differ matches layers by it before falling back
   *  to paths. Instance descendants carry Figma's compound id ("I12:3;45:6"). */
  id?: string
  /** Layer path inside the variant, "/" separated. */
  p: string
  t: string
  /** Bound properties → Brand variable name. */
  b: Record<string, string>
  /** Raw (unbound) values worth knowing: opacity, strokeWeight, radius, size, text, layout. */
  r?: Record<string, unknown>
  /** Main component name when the node is an instance. */
  i?: string
  /** Main component node id when the node is an instance. */
  mc?: string
  /** Applied styles by kind (text / fill / stroke / effect) → style name. */
  st?: Record<string, string>
  /** Component property references (visible / characters / mainComponent). */
  pr?: Record<string, string>
  /** Instance property overrides. */
  cp?: Record<string, unknown>
  /** Present on descendants of an instance: the fields this instance overrides on that layer (Figma `overriddenFields`). */
  o?: string[]
}

export interface ComponentVariant {
  id: string
  /** Component publish key. */
  key?: string
  name: string
  props: Record<string, string>
  nodes: ComponentNode[]
}

export interface ComponentPropDefinition {
  type: string
  options?: string[]
  default: unknown
}

export interface ComponentSetSnapshot {
  /** Exported name in src/shared/ui. */
  code: string
  id: string
  /** Component (set) publish key. */
  key?: string
  name: string
  description: string
  props: Record<string, ComponentPropDefinition>
  variants: ComponentVariant[]
  /** built = a code component exists and the drift gate enforces it; planned = mapped only;
   *  alias = a duplicate of (or a glyph source for) another code component, see aliasOf. */
  status?: 'built' | 'planned' | 'alias'
  /** For status 'alias': the code component that covers this set (e.g. Icon, Button). */
  aliasOf?: string
  /** Folder holding <code>.css and <code>.figma.ts when the code does not live in src/shared/ui/<code> (shell screens). */
  dir?: string
}

export interface CoverageRow {
  /** Tier: the page label on tier pages (Atoms, Molecules, Organisms, Icons), the section on the legacy page. */
  section: string
  /** Tier pages only: the tab section the component is filed under, when it differs from the tier. */
  group?: string
  type: string
  name: string
  id: string
  variants: number
  coverage: number | null
}

export interface ComponentsSnapshot {
  fileKey: string
  /** The page walked; on tier pages, the first of `pages`. */
  page: { id: string; name: string }
  /** Tier pages only: every page walked, in order. */
  pages?: { id: string; name: string }[]
  pulledAt: string
  /** Figma file version (REST only). */
  version?: string
  sets: ComponentSetSnapshot[]
  coverage: CoverageRow[]
}

/** `set` is the code prefix of a UI icon set (figma/manifest.json → uiIconSets); absent for the Tab Icons set. */
export interface IconEntry { id: string; name: string; svg: string; set?: string }
/** A Figma UI icon set exported as `ui-<prefix>-<variant>` glyphs. `rawColors` keeps product colours (app marks). */
export interface UiIconSet { id: string; name: string; prefix: string; rawColors?: boolean }
export interface IconsSnapshot {
  fileKey: string
  set: { id: string; name: string; variantProperty: string }
  icons: Record<string, IconEntry>
  marks: Record<string, { id: string; svg: string }>
}

/** Variable metadata as either backend reads it (Plugin API `Variable` or REST `/variables/local`),
 *  kept only when present so snapshots stay lean and both backends write the same keys. */
export function variableMeta(v: { key?: string; description?: string; scopes?: readonly string[]; codeSyntax?: Readonly<Record<string, string>>; hiddenFromPublishing?: boolean }): Partial<SnapshotVariable> {
  return {
    ...(v.key ? { publishKey: v.key } : {}),
    ...(v.description ? { description: v.description } : {}),
    ...(v.scopes?.length ? { scopes: [...v.scopes] } : {}),
    ...(v.codeSyntax && Object.keys(v.codeSyntax).length ? { codeSyntax: { ...v.codeSyntax } } : {}),
    ...(v.hiddenFromPublishing ? { hiddenFromPublishing: true } : {}),
  }
}

export const CSS_VAR_PREFIX = '--bb-'

/** "button/primary/bg/default" → "--bb-button-primary-bg-default" */
export function cssVarName(variableName: string): string {
  return `${CSS_VAR_PREFIX}${tokenKeyFromVariableName(variableName)}`
}

/** Figma mode name → brand id used in plugin.config.json and data-brand. */
export function brandIdFromMode(mode: string): string {
  return mode.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const UNITLESS = /(^|\/|-)(font\/)?weight(\/|-|$)|opacity/
const FONT_FAMILY = /family/

/**
 * Format a resolved variable value as a CSS custom property value.
 * FLOATs are px unless the variable is a weight or an opacity.
 * Font families are quoted so multi-word names survive.
 */
export function cssValueFor(name: string, type: VariableType, value: ResolvedValue): string | null {
  if (value === null || value === undefined) return null
  switch (type) {
    case 'COLOR':
      return typeof value === 'string' ? value : null
    case 'FLOAT': {
      if (typeof value !== 'number') return null
      const rounded = Math.round(value * 1000) / 1000
      return UNITLESS.test(name) ? String(rounded) : `${rounded}px`
    }
    case 'STRING':
      if (typeof value !== 'string') return null
      return FONT_FAMILY.test(name) ? JSON.stringify(value) : value
    case 'BOOLEAN':
      return typeof value === 'boolean' ? String(value) : null
    default:
      return null
  }
}

/** Variant name "Type=Primary, State=Default" → { Type: 'Primary', State: 'Default' } */
export function parseVariantName(name: string): Record<string, string> {
  return Object.fromEntries(
    name.split(',').map((part): [string, string] => {
      const [k = '', v = ''] = part.split('=')
      return [k.trim(), v.trim()]
    }).filter(([k]) => k.length > 0),
  )
}
