// This tab's wire contract: reveal a node, read what the selection binds (for
// answers grounded in the Dual File libraries), open a library link and ask Claude. The
// library index itself comes from the shared `libraries:load`.
import type { AiFailure } from '@shared/ai'
import * as z from 'zod/mini'

export const MSG = {
  focus: 'uxai:focus',
  selection: 'uxai:selection',
  open: 'uxai:open',
  /** Ask the model: the UI sends the conversation with its library context; the sandbox adds the provider, key and model. */
  ask: 'uxai:ask',
} as const

const MAX_MESSAGES = 12
const MAX_MESSAGE_CHARS = 20_000

export const askRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().check(z.minLength(1), z.maxLength(MAX_MESSAGE_CHARS)),
  })).check(z.minLength(1), z.maxLength(MAX_MESSAGES)),
})
export type AskRequest = z.infer<typeof askRequestSchema>

/** The model's reply, or why no model was asked (the UI then shows the library answer as it is). */
export type AskResult =
  | { status: 'answered'; text: string; model: string; provider: 'claude' | 'openai' | 'gemini' }
  | { status: 'not-configured'; reason: 'disabled' | 'no-key' }
  | { status: 'failed'; failure: AiFailure }

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>

/** Only links into Figma files: the URL comes from the UI, so the sandbox doesn't trust it to point anywhere else. */
export const FIGMA_LINK_PREFIX = 'https://www.figma.com/design/'
export const openRequestSchema = z.object({ url: z.string().check(z.startsWith(FIGMA_LINK_PREFIX), z.maxLength(2048)) })

/** A variable bound somewhere in the selection. `remote` = it comes from a library, not this file. */
export interface BoundVariableRef {
  name: string
  /** The variable's key; for a library variable it equals the key the REST API reports in that library. */
  key: string
  remote: boolean
  /** Bound fields, e.g. fills, paddingLeft, itemSpacing. */
  properties: readonly string[]
  /** How many layers bind it. */
  layers: number
}

/** A component the selection has instances of. */
export interface InstanceRef {
  /** The component set's name for a variant, else the component's. */
  name: string
  /** The main component's key (a variant's key for a variant). */
  key: string
  remote: boolean
  count: number
}

export interface SelectionContext {
  /** The first selected layer. */
  name: string
  type: string
  /** Layers walked; capped at SELECTION_NODE_LIMIT. */
  nodes: number
  truncated: boolean
  /** Layers selected; only the first is read. */
  selected: number
  variables: readonly BoundVariableRef[]
  components: readonly InstanceRef[]
}

/** Enough for a component or a screen section; a whole page would stall the sandbox. */
export const SELECTION_NODE_LIMIT = 800
