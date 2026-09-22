// Shapes shared by the Figma extractor (runs inside Figma), the pull script
// (REST or relay), the generator, and the drift checker. Pure types + pure
// helpers: no Figma or DOM access here so every consumer can unit-test them.
import { tokenKeyFromVariableName } from './tokens'

export type VariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
export type ResolvedValue = string | number | boolean | null

export interface SnapshotVariable {
  name: string
  type: VariableType
  /** Resolved (alias-followed) value per mode name. */
  values: Record<string, ResolvedValue>
  /** First-hop alias per mode, "<collection>/<variable>", when the value is an alias. */
  aliases?: Record<string, string>
}

export interface SnapshotCollection {
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
  collections: SnapshotCollection[]
}

export interface ComponentNode {
  /** Layer path inside the variant, "/" separated. */
  p: string
  t: string
  /** Bound properties → Brand variable name. */
  b: Record<string, string>
  /** Raw (unbound) values worth knowing: opacity, strokeWeight, radius, size, text, layout. */
  r?: Record<string, unknown>
  /** Main component name when the node is an instance. */
  i?: string
  /** Component property references (visible / characters / mainComponent). */
  pr?: Record<string, string>
  /** Instance property overrides. */
  cp?: Record<string, unknown>
  /** Present on descendants of an instance: the fields this instance overrides on that layer (Figma `overriddenFields`). */
  o?: string[]
}

export interface ComponentVariant {
  id: string
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
  name: string
  description: string
  props: Record<string, ComponentPropDefinition>
  variants: ComponentVariant[]
  /** built = a code component exists and the drift gate enforces it; planned = mapped only;
   *  alias = a duplicate of (or a glyph source for) another code component, see aliasOf. */
  status?: 'built' | 'planned' | 'alias'
  /** For status 'alias': the code component that covers this set (e.g. Icon, Button). */
  aliasOf?: string
}

export interface CoverageRow {
  section: string
  type: string
  name: string
  id: string
  variants: number
  coverage: number | null
}

export interface ComponentsSnapshot {
  fileKey: string
  page: { id: string; name: string }
  pulledAt: string
  sets: ComponentSetSnapshot[]
  coverage: CoverageRow[]
}

export interface IconEntry { id: string; name: string; svg: string }
export interface IconsSnapshot {
  fileKey: string
  set: { id: string; name: string; variantProperty: string }
  icons: Record<string, IconEntry>
  marks: Record<string, { id: string; svg: string }>
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
