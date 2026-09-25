// Reads the Brand variable collection so a finding can talk in tokens, not hexes.
// Runs inside Figma. The maths it feeds lives in ../tokens.ts and is pure.
import type { RGB } from '@shared/figma/color'
import type { PaletteEntry } from '../tokens'

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

/**
 * Resolve one variable's value in one mode, following aliases.
 *
 * An alias points at a variable in another collection, which has modes of its
 * own; we take that collection's default (first) mode, which is what Figma
 * shows when nothing overrides it.
 */
async function resolveColor(variable: Variable, modeId: string, depth = 0): Promise<RGB | null> {
  if (depth > MAX_ALIAS_DEPTH) return null
  const value = variable.valuesByMode[modeId]
  if (value === undefined) return null
  if (isAlias(value)) {
    const target = await figma.variables.getVariableByIdAsync(value.id)
    if (!target) return null
    const collection = await figma.variables.getVariableCollectionByIdAsync(target.variableCollectionId)
    const targetMode = collection?.defaultModeId ?? Object.keys(target.valuesByMode)[0]
    if (!targetMode) return null
    return resolveColor(target, targetMode, depth + 1)
  }
  return isColor(value) ? { r: value.r, g: value.g, b: value.b } : null
}

/**
 * Load the brand palette once per scan.
 *
 * Returns null when the file has no such collection — the plugin then falls
 * back to reporting hexes, which is what it did before tokens existed.
 */
export async function loadBrandPalette(collectionName: string, activeModeName: string): Promise<BrandPalette | null> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const collection = collections.find((c) => c.name === collectionName)
  if (!collection) return null

  const modes = collection.modes
  const activeMode = modes.find((m) => m.name === activeModeName) ?? modes[0]
  if (!activeMode) return null

  const entries: PaletteEntry[] = []
  const byMode = new Map<string, Record<string, RGB | null>>()
  const names = new Map<string, string>()

  for (const id of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(id)
    if (!variable || variable.resolvedType !== 'COLOR') continue
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
