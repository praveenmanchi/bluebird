// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'

export const MSG = {
  check: 'varmapper:check',
  progress: 'varmapper:progress',
  bind: 'varmapper:bind',
  undo: 'varmapper:undo',
  select: 'varmapper:select',
  goto: 'varmapper:goto',
} as const

export const CATEGORIES = ['colors', 'border', 'spacing', 'typography'] as const
export type Category = (typeof CATEGORIES)[number]

/** Node fields a variable can be bound to. `cornerRadius` means all four corners. */
export const BIND_FIELDS = [
  'fills', 'strokes', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
  'strokeWeight', 'strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight',
  'itemSpacing', 'counterAxisSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing',
] as const
export type BindField = (typeof BIND_FIELDS)[number]

const targetSchema = z.object({
  nodeId: z.string().check(z.minLength(1)),
  field: z.enum(BIND_FIELDS),
  /** Which paint, for fills and strokes. */
  paintIndex: z.optional(z.int().check(z.minimum(0))),
})
export type Target = z.infer<typeof targetSchema>

const targetsSchema = z.array(targetSchema).check(z.minLength(1), z.maxLength(5000))

/**
 * `value` and `opacity` are what the check saw: a layer that no longer holds them is left alone.
 * `keepValue` means the variable must leave the layer looking the same: a layer it changes is restored.
 */
export const bindRequestSchema = z.object({
  variableKey: z.string().check(z.minLength(1)),
  targets: targetsSchema,
  value: z.union([z.number(), z.string().check(z.regex(/^#[0-9A-F]{6}$/))]),
  opacity: z.optional(z.number().check(z.minimum(0), z.maximum(1))),
  keepValue: z.boolean(),
})
export type BindRequest = z.infer<typeof bindRequestSchema>

/** Undoes one Bind, from the snapshot the sandbox took then. */
export const undoRequestSchema = z.object({ undoId: z.string().check(z.minLength(1)) })

export const selectRequestSchema = z.object({ nodeIds: z.array(z.string()).check(z.minLength(1), z.maxLength(5000)) })
export const gotoRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })

/** The variable scope a value needs. Fills accept ALL_FILLS too. */
export type ValueScope = 'FRAME_FILL' | 'SHAPE_FILL' | 'TEXT_FILL' | 'STROKE_COLOR' | 'CORNER_RADIUS' | 'STROKE_FLOAT' | 'GAP'
  | 'FONT_SIZE' | 'FONT_WEIGHT' | 'LINE_HEIGHT' | 'LETTER_SPACING' | 'PARAGRAPH_SPACING'

export interface LayerRef { id: string; name: string; path: string }

/** What one layer's surroundings already use. Counts are by name prefix and by variable + role. */
export interface Neighbourhood {
  total: number
  /** "jira" → bindings under it. */
  first: ReadonlyMap<string, number>
  /** "jira/surface" → bindings under it. */
  firstTwo: ReadonlyMap<string, number>
  /** "<variable key>|<role>" → bindings. */
  uses: ReadonlyMap<string, number>
}

/** Where a value sits, which is what separates variables that share it. Sandbox only. */
export interface MatchContext {
  /** Collection name → the mode this layer renders in. */
  modes: Readonly<Record<string, string>>
  /** Lower-case words of the layer's name and its parents', outermost first. */
  words: readonly string[]
  /** Nearest first: the layer, then its parents. */
  neighbours: readonly Neighbourhood[]
}

/** One hard-coded value on one layer. */
export interface Finding {
  category: Category
  /** "Corner radius", "Fill", "Gap"… */
  property: string
  /** #RRGGBB for colours, px otherwise. */
  value: number | string
  /** Paint opacity, for colours. */
  opacity?: number
  scope: ValueScope
  target: Target
  layer: LayerRef
  context?: MatchContext
}

/**
 * exact: same value in the layer's mode, and one variable clearly fits.
 * check: same value, but a designer has to choose between variables.
 * near: no variable has this value, and binding one changes it.
 * none: nothing close.
 */
export type MatchKind = 'exact' | 'check' | 'near' | 'none'

export interface Candidate {
  /** Variable.key, which is how a library variable is imported. */
  key: string
  name: string
  /** The value that matched, as shown: "16" or "#F7F7F7". */
  value: string
  collection: string
  /** Same value in the layer's mode, so binding it changes nothing. */
  exact: boolean
}

/** Every layer holding one value for one property. */
export interface MapperGroup {
  id: string
  category: Category
  property: string
  value: number | string
  opacity?: number
  /** "16 px" or "#FAFAFA". */
  current: string
  layers: readonly LayerRef[]
  targets: readonly Target[]
  match: MatchKind
  /** Best first. Empty when the source has nothing of this type. */
  candidates: readonly Candidate[]
  /** How many variables have this exact value. */
  matches: number
  /** The mode the values were compared in, when the source has modes. */
  mode?: string
}

export interface SourceInfo { name: string; variables: number }

export interface SelectionInfo { name: string; meta: string }

export type CheckResult =
  | { status: 'no-source'; message: string }
  | { status: 'source-failed'; message: string }
  | { status: 'no-selection'; source: SourceInfo }
  | { status: 'ready'; source: SourceInfo; selection: SelectionInfo; groups: readonly MapperGroup[]; visited: number; skippedInstances: number }

export interface CheckProgress { visited: number }

export interface BindResult {
  bound: number
  /** Left alone: the layer changed since the check, or is gone. */
  skipped: number
  /** Put back: binding changed what the layer looked like. */
  restored: number
  /** Distinct layers among `restored`. */
  restoredLayers: number
  /** Changed by binding and couldn't be put back: these stay bound, and Undo still covers them. */
  stuck: number
  variable: string
  undoId: string
}
export interface UndoResult {
  restored: number
  /** Left alone: the layer no longer holds this binding. */
  skipped: number
}
export interface SelectResult { selected: number; page: string }
export interface GotoResult { page: string; name: string }
