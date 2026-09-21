/** A flat brand token map: `color-brand` → `#0066ff`, `radius-md` → `8px`. */
export type TokenMap = Readonly<Record<string, string>>

export const CSS_VAR_PREFIX = '--bb-'

export interface BrandTokensResult {
  brandId: string
  /** 'figma' when resolved from a variable collection, 'fallback' when using plugin.config.json values. */
  source: 'figma' | 'fallback'
  tokens: TokenMap
  /** Human readable reason when source === 'fallback'. */
  note?: string
}

/** Figma variable name "color/brand" or "Color / Brand" → token key "color-brand". */
export function tokenKeyFromVariableName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Fallback tokens always win over nothing: Figma tokens override fallback keys they define. */
export function mergeTokens(fallback: TokenMap, resolved: TokenMap): TokenMap {
  return { ...fallback, ...resolved }
}

export function toCssVariables(tokens: TokenMap): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(tokens).map(([key, value]) => [`${CSS_VAR_PREFIX}${key}`, value]))
}
