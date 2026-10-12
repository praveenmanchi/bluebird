// Runs in the Figma sandbox. Resolves a brand's variable collection + mode
// into a flat TokenMap. The collection comes from the open file or, failing that,
// its enabled libraries. Falls back to plugin.config.json tokens when neither has it.
import { rgbaToHex } from '../figma/color'
import { findVariableCollection, type FoundCollection } from './collection'
import { cssValueFor } from './snapshot'
import { mergeTokens, tokenKeyFromVariableName, type BrandTokensResult, type TokenMap } from './tokens'

export interface BrandSource {
  id: string
  collection: string
  mode: string
  fallbackTokens: TokenMap
}

export async function resolveBrandTokens(source: BrandSource): Promise<BrandTokensResult> {
  const fallback: BrandTokensResult = {
    brandId: source.id,
    source: 'fallback',
    tokens: source.fallbackTokens,
  }
  let collection: FoundCollection | null
  try {
    collection = await findVariableCollection(source.collection)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { ...fallback, note: `Could not read the "${source.collection}" library collection (${reason}). Using fallback tokens.` }
  }
  if (!collection) {
    return { ...fallback, note: `Variable collection "${source.collection}" not found in this file or its enabled libraries. Using fallback tokens.` }
  }
  const mode = collection.modes.find((m) => m.name === source.mode)
  if (!mode) {
    return { ...fallback, note: `Mode "${source.mode}" not found in collection "${source.collection}". Using fallback tokens.` }
  }

  const resolved: Record<string, string> = {}
  for (const variable of collection.variables) {
    const value = await resolveValue(variable.valuesByMode[mode.modeId], mode.modeId, 0)
    const css = toCssValue(value, variable.resolvedType, variable.name)
    if (css !== null) resolved[tokenKeyFromVariableName(variable.name)] = css
  }
  return { brandId: source.id, source: 'figma', tokens: mergeTokens(source.fallbackTokens, resolved) }
}

const MAX_ALIAS_DEPTH = 8

async function resolveValue(value: VariableValue | undefined, modeId: string, depth: number): Promise<VariableValue | undefined> {
  if (value === undefined || depth > MAX_ALIAS_DEPTH) return undefined
  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    const target = await figma.variables.getVariableByIdAsync(value.id)
    if (!target) return undefined
    // Aliased variable may live in a collection with different modes: take the
    // same mode if present, otherwise its first mode.
    const next = target.valuesByMode[modeId] ?? Object.values(target.valuesByMode)[0]
    return resolveValue(next, modeId, depth + 1)
  }
  return value
}

export function toCssValue(value: VariableValue | undefined, type: VariableResolvedDataType, name = ''): string | null {
  if (value === undefined) return null
  if (type === 'COLOR') return typeof value === 'object' && 'r' in value ? rgbaToHex(value) : null
  if (typeof value === 'object') return null
  if (type !== 'FLOAT' && type !== 'STRING' && type !== 'BOOLEAN') return null
  return cssValueFor(name, type, value)
}
