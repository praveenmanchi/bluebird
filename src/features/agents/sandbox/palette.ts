// The brand palette the agents swap raw values for: the Brand UI collection (local or
// from the enabled library), every colour and number variable resolved in every mode.
// Runs inside Figma; the matching maths lives in ../rules and is pure.
import { findVariableCollection } from '@shared/brand/collection'
import type { RGB } from '@shared/figma/color'

export interface PaletteColor { id: string; name: string; scopes: readonly string[]; byMode: Readonly<Record<string, RGB | null>> }
export interface PaletteNumber { id: string; name: string; scopes: readonly string[]; value: number }

export interface Palette {
  collection: string
  modes: readonly string[]
  /** The mode the file shows (the collection's first mode, or the brand's). */
  activeMode: string
  colors: readonly PaletteColor[]
  numbers: readonly PaletteNumber[]
}

const MAX_ALIAS_DEPTH = 8

const isAlias = (v: unknown): v is VariableAlias => typeof v === 'object' && v !== null && (v as VariableAlias).type === 'VARIABLE_ALIAS'
const isColor = (v: unknown): v is RGB => typeof v === 'object' && v !== null && 'r' in (v as RGB)

async function resolve(variable: Variable, modeId: string, depth = 0): Promise<unknown> {
  if (depth > MAX_ALIAS_DEPTH) return null
  const value = variable.valuesByMode[modeId]
  if (value === undefined) return null
  if (!isAlias(value)) return value
  const target = await figma.variables.getVariableByIdAsync(value.id)
  if (!target) return null
  const collection = await figma.variables.getVariableCollectionByIdAsync(target.variableCollectionId)
  const mode = collection?.modes.find((m) => m.modeId === modeId)?.modeId ?? collection?.defaultModeId ?? Object.keys(target.valuesByMode)[0]
  return mode ? resolve(target, mode, depth + 1) : null
}

/** Null when neither the file nor its enabled libraries carry the collection. */
export async function loadPalette(collectionName: string, preferredMode: string): Promise<Palette | null> {
  let found: Awaited<ReturnType<typeof findVariableCollection>>
  try {
    found = await findVariableCollection(collectionName)
  } catch {
    return null
  }
  if (!found) return null
  const modes = found.modes
  const colors: PaletteColor[] = []
  const numbers: PaletteNumber[] = []
  for (const variable of found.variables) {
    if (variable.resolvedType === 'COLOR') {
      const byMode: Record<string, RGB | null> = {}
      for (const mode of modes) {
        const v = await resolve(variable, mode.modeId)
        byMode[mode.name] = isColor(v) ? { r: v.r, g: v.g, b: v.b } : null
      }
      colors.push({ id: variable.id, name: variable.name, scopes: variable.scopes ?? [], byMode })
    } else if (variable.resolvedType === 'FLOAT') {
      const first = modes[0]
      const v = first ? await resolve(variable, first.modeId) : null
      if (typeof v === 'number') numbers.push({ id: variable.id, name: variable.name, scopes: variable.scopes ?? [], value: v })
    }
  }
  const activeMode = modes.find((m) => m.name === preferredMode)?.name ?? modes[0]?.name ?? preferredMode
  return { collection: found.name, modes: modes.map((m) => m.name), activeMode, colors, numbers }
}

/** The colour a bound variable takes in each requested mode (empty when unbound or not in the palette). */
export function modeColors(palette: Palette | null, variableId: string | undefined, modes: readonly string[]): Record<string, RGB | null> {
  if (!palette || !variableId) return {}
  const entry = palette.colors.find((c) => c.id === variableId)
  if (!entry) return {}
  return Object.fromEntries(modes.filter((m) => m in entry.byMode).map((m) => [m, entry.byMode[m] ?? null]))
}
