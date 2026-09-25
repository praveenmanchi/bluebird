// Shapes of the Figma REST responses the pull reads. Only the fields we use.
import type { VariableType } from '../../src/shared/brand/snapshot'

export type RestAlias = { id: string }

export interface RestPaint { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number; a?: number }; boundVariables?: { color?: RestAlias } }

export interface RestTextStyle {
  fontSize?: number; fontFamily?: string; fontWeight?: number; fontStyle?: string; fontPostScriptName?: string | null
  lineHeightPx?: number; lineHeightPercentFontSize?: number; lineHeightUnit?: string
}

export interface RestNode {
  id: string; name: string; type: string; visible?: boolean; opacity?: number; children?: RestNode[]
  fills?: RestPaint[]
  strokes?: RestPaint[]
  strokeWeight?: number; cornerRadius?: number; layoutMode?: string
  rectangleCornerRadii?: [number, number, number, number]
  primaryAxisAlignItems?: string; counterAxisAlignItems?: string; layoutSizingHorizontal?: string; layoutSizingVertical?: string
  itemSpacing?: number; paddingLeft?: number; paddingRight?: number; paddingTop?: number; paddingBottom?: number
  absoluteBoundingBox?: { width: number; height: number }
  rotation?: number
  individualStrokeWeights?: { top: number; right: number; bottom: number; left: number }
  characters?: string
  style?: RestTextStyle
  styleOverrideTable?: Record<string, Partial<RestTextStyle>>
  characterStyleOverrides?: number[]
  /** Applied styles by kind ("text", "fill", "stroke", "effect", "grid") → style id. */
  styles?: Record<string, string>
  boundVariables?: Record<string, RestAlias | RestAlias[] | Record<string, RestAlias>>
  componentPropertyDefinitions?: Record<string, { type: string; variantOptions?: string[]; defaultValue: unknown }>
  componentPropertyReferences?: Record<string, string>
  componentProperties?: Record<string, { value: unknown }>
  componentId?: string
  description?: string
  overrides?: { id: string; overriddenFields: string[] }[]
}

export interface RestComponentMeta { key?: string; name: string; componentSetId?: string; description?: string }
export interface RestStyleMeta { name: string; styleType: string }

export interface RestNodesResponse {
  version?: string
  lastModified?: string
  nodes: Record<string, {
    document: RestNode
    components?: Record<string, RestComponentMeta>
    componentSets?: Record<string, RestComponentMeta>
    styles?: Record<string, RestStyleMeta>
  } | null>
}

export interface RestVariable {
  id: string; name: string; key?: string; remote?: boolean
  resolvedType: VariableType; variableCollectionId: string; valuesByMode: Record<string, unknown>
  description?: string; scopes?: string[]; codeSyntax?: Record<string, string>; hiddenFromPublishing?: boolean
}

export interface RestCollection {
  id: string; name: string; key?: string; remote?: boolean
  modes: { modeId: string; name: string }[]; defaultModeId: string; variableIds: string[]
}
