// Reads the brand variable collection (local or from a library) so a finding can talk in tokens, not hexes.
// Runs inside Figma. The maths it feeds lives in ../tokens.ts and is pure.
import type { RGB } from '@shared/figma/color'
import type { PaletteEntry } from '../tokens'
import { findVariableCollection } from '@shared/brand/collection'

export interface BrandPalette {
  /** Mode names in file order, e.g. Bridge / Ikea / Richemont / Disney / Fiskars. */
  readonly modeNames: readonly string[]
  /** Colour variables resolved in the active mode — the candidates for a fix. */
  readonly entries: readonly PaletteEntry[]
  /** variableId → mode name → colour, or null where that mode has no value. */
  readonly byMode: ReadonlyMap<string, Record<string, RGB | null>>
  /** variableId → variable path, for naming a token on the card. */
  readonly names: ReadonlyMap<string, string>
}

/** Aliases can chain; stop well before anything pathological. */
const MAX_ALIAS_DEPTH = 8

function isAlias(value: unknown): value is VariableAlias {
  return typeof value === 'object' && value !== null && (value as VariableAlias).type === 'VARIABLE_ALIAS'
}

function isColor(value: unknown): value is RGB {
  return typeof value === 'object' && value !== null && 'r' in (value as RGB)
}

async function defaultModeOf(variable: Variable): Promise<string | undefined> {
  const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId)
  return collection?.defaultModeId ?? Object.keys(variable.valuesByMode)[0]
}

/**
 * Resolve one variable's value in one mode, following aliases.
 *
 * An alias into another collection lands on modes of its own; we take that
 * collection's default (first) mode, which is what Figma shows when nothing
 * overrides it.
 */
async function resolveColor(variable: Variable, modeId: string, depth = 0): Promise<RGB | null> {
  if (depth > MAX_ALIAS_DEPTH) return null
  const value = variable.valuesByMode[modeId]
  if (value === undefined) return null
  if (isAlias(value)) {
    const target = await figma.variables.getVariableByIdAsync(value.id)
    if (!target) return null
    // A tier-2 brand token aliasing a tier-1 one in the same collection must be read in the
    // same brand mode, or every brand resolves to the default brand's colour.
    const targetMode = modeId in target.valuesByMode ? modeId : await defaultModeOf(target)
    if (!targetMode) return null
    return resolveColor(target, targetMode, depth + 1)
  }
  return isColor(value) ? { r: value.r, g: value.g, b: value.b } : null
}

/**
 * Load the brand palette once per scan.
 *
 * Returns null when neither the file nor its enabled libraries have the
 * collection — the plugin then falls back to reporting hexes, which is what
 * it did before tokens existed.
 */
export async function loadBrandPalette(collectionName: string, activeModeName: string): Promise<BrandPalette | null> {
  const collection = await findVariableCollection(collectionName)
  if (!collection) return null

  const modes = collection.modes
  const activeMode = modes.find((m) => m.name === activeModeName) ?? modes[0]
  if (!activeMode) return null

  const entries: PaletteEntry[] = []
  const byMode = new Map<string, Record<string, RGB | null>>()
  const names = new Map<string, string>()

  for (const variable of collection.variables) {
    if (variable.resolvedType !== 'COLOR') continue
    const id = variable.id
    names.set(id, variable.name)

    const perMode: Record<string, RGB | null> = {}
    for (const mode of modes) perMode[mode.name] = await resolveColor(variable, mode.modeId)
    byMode.set(id, perMode)

    const active = perMode[activeMode.name]
    if (active) entries.push({ id, name: variable.name, rgb: active, scopes: variable.scopes ?? [] })
  }

  return { modeNames: modes.map((m) => m.name), entries, byMode, names }
}

/** The colours a variable takes in every mode, or an empty map when unbound. */
export function modeColors(palette: BrandPalette | null, variableId: string | undefined): Record<string, RGB | null> {
  if (!palette || !variableId) return {}
  return palette.byMode.get(variableId) ?? {}
}

/** The variable a layer is bound to, and the brand variable its value comes from. */
export interface BoundToken {
  /** The bound variable's own path: what the designer sees in the fill picker. */
  name: string
  /** The brand-collection variable it is, or aliases; absent when it never reaches the brand palette. */
  brandId?: string
}

export type TokenLookup = (variableId: string | undefined) => Promise<BoundToken | undefined>

/**
 * Layers are usually bound to a semantic variable that aliases a brand one, not to the brand
 * variable itself. Following the alias is what lets a finding name its token and be judged in
 * every brand mode. One lookup per scan: each variable is traced once.
 */
export function tokenLookup(palette: BrandPalette | null): TokenLookup {
  const traced = new Map<string, Promise<BoundToken | undefined>>()
  return (variableId) => {
    if (!palette || !variableId) return Promise.resolve(undefined)
    let hit = traced.get(variableId)
    if (!hit) traced.set(variableId, (hit = trace(palette, variableId).catch(() => undefined)))
    return hit
  }
}

async function trace(palette: BrandPalette, variableId: string): Promise<BoundToken | undefined> {
  const brandName = palette.names.get(variableId)
  if (brandName) return { name: brandName, brandId: variableId }
  let variable = await figma.variables.getVariableByIdAsync(variableId)
  const name = variable?.name
  if (!name) return undefined
  for (let depth = 0; variable && depth <= MAX_ALIAS_DEPTH; depth += 1) {
    if (palette.byMode.has(variable.id)) return { name, brandId: variable.id }
    const mode = await defaultModeOf(variable)
    const value: unknown = mode ? variable.valuesByMode[mode] : undefined
    if (!isAlias(value)) break
    variable = await figma.variables.getVariableByIdAsync(value.id)
  }
  return { name }
}
