// This tab's wire contract. UI only for now: the agents run on fixtures in the
// UI, so the sandbox only knows how to select the layer a finding points at.
import * as z from 'zod/mini'

export const MSG = {
  focus: 'agents:focus',
} as const

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>
