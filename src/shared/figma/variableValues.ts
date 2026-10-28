// Value rules of the Figma Variables REST API that every reader of /variables/local needs:
// aliases, composed colours (a colour and an opacity, at least one of them an alias) and
// extended collections (a brand/theme layer over a parent collection that overrides some values).
// https://developers.figma.com/docs/rest-api/variables-types/
// Pure: no fetch, no figma global.

export interface RestAliasLike { type: 'VARIABLE_ALIAS'; id: string }
export interface RgbaLike { r: number; g: number; b: number; a?: number }
/** VariableComposedColor: `opacity` is a percentage (0–100) or an alias to a FLOAT. */
export interface ComposedColorLike { color: RgbaLike | RestAliasLike; opacity: number | RestAliasLike }

export interface ModeLike { modeId: string; name: string; parentModeId?: string }
export interface CollectionLike {
  id: string
  modes: readonly ModeLike[]
  defaultModeId: string
  isExtension?: boolean
  parentVariableCollectionId?: string
  /** variableId → modeId → value; only on extended collections. */
  variableOverrides?: Readonly<Record<string, Readonly<Record<string, unknown>>>>
}
export interface VariableLike { id: string; variableCollectionId: string; valuesByMode: Readonly<Record<string, unknown>> }

/** How far an alias / extension chain is followed before giving up (a loop in the file). */
export const MAX_VALUE_DEPTH = 10

export const isAlias = (v: unknown): v is RestAliasLike =>
  typeof v === 'object' && v !== null && (v as { type?: unknown }).type === 'VARIABLE_ALIAS' && typeof (v as { id?: unknown }).id === 'string'

export const isRgba = (v: unknown): v is RgbaLike =>
  typeof v === 'object' && v !== null && typeof (v as RgbaLike).r === 'number' && typeof (v as RgbaLike).g === 'number' && typeof (v as RgbaLike).b === 'number'

export const isComposedColor = (v: unknown): v is ComposedColorLike =>
  typeof v === 'object' && v !== null && 'color' in v && 'opacity' in v

/**
 * The raw value a variable holds in one mode of `collection`. An extended collection answers from
 * its own override first, then the variable's own value for that mode (variables created in the
 * extension), then the parent collection's matching mode (`parentModeId`), up to the root.
 */
export function rawModeValue(
  variable: VariableLike,
  collection: CollectionLike | undefined,
  modeId: string,
  collectionsById: Readonly<Record<string, CollectionLike | undefined>>,
): unknown {
  let current = collection
  let mode = modeId
  for (let depth = 0; depth < MAX_VALUE_DEPTH; depth += 1) {
    const override = current?.variableOverrides?.[variable.id]?.[mode]
    if (override !== undefined) return override
    if (variable.valuesByMode[mode] !== undefined) return variable.valuesByMode[mode]
    if (!current?.isExtension || !current.parentVariableCollectionId) return undefined
    const parentMode = current.modes.find((m) => m.modeId === mode)?.parentModeId
    if (!parentMode) return undefined
    current = collectionsById[current.parentVariableCollectionId]
    mode = parentMode
  }
  return undefined
}

/** A composed colour flattened to one RGBA: the colour's alpha times the opacity percentage. */
export function composeColor(color: unknown, opacity: unknown): RgbaLike | undefined {
  if (!isRgba(color) || typeof opacity !== 'number') return undefined
  const share = Math.min(100, Math.max(0, opacity)) / 100
  return { r: color.r, g: color.g, b: color.b, a: (color.a ?? 1) * share }
}
