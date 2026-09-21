// Runs in the Figma sandbox. Resolves a brand's variable collection + mode
// into a flat TokenMap. Falls back to plugin.config.json tokens when the
// collection or mode is missing in the current file.
import { rgbaToHex } from '../figma/color'
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
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const collection = collections.find((c) => c.name === source.collection)
  if (!collection) {
    return { ...fallback, note: `Variable collection "${source.collection}" not found in this file. Using fallback tokens.` }
  }
  const mode = collection.modes.find((m) => m.name === source.mode)
  if (!mode) {
    return { ...fallback, note: `Mode "${source.mode}" not found in collection "${source.collection}". Using fallback tokens.` }
  }

  const resolved: Record<string, string> = {}
  for (const variableId of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(variableId)
    if (!variable) continue
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
