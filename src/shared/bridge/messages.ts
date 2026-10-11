/**
 * Wire format shared by every transport (postMessage, WebSocket, mock).
 *
 * Message types are namespaced by feature id: `a11y:scan`, `brand:tokens`.
 * The router dispatches by exact type, so two tabs can never collide.
 */
import * as z from 'zod/mini'

const TYPE = /^[a-z0-9-]+:[a-z0-9-]+$/

/** Whether a message type is one the bridge accepts (`namespace:action`, lower-case). Others are dropped on receipt. */
export const isMessageType = (type: string): boolean => TYPE.test(type)
const nonEmpty = () => z.string().check(z.minLength(1))

export const requestSchema = z.object({
  kind: z.literal('request'),
  id: nonEmpty(),
  type: z.string().check(z.regex(TYPE)),
  payload: z.unknown(),
})

export const responseSchema = z.object({
  kind: z.literal('response'),
  id: nonEmpty(),
  ok: z.boolean(),
  data: z.optional(z.unknown()),
  error: z.optional(z.string()),
})

export const eventSchema = z.object({
  kind: z.literal('event'),
  type: z.string().check(z.regex(TYPE)),
  payload: z.unknown(),
})

export const messageSchema = z.discriminatedUnion('kind', [requestSchema, responseSchema, eventSchema])

export type BridgeRequest = z.infer<typeof requestSchema>
export type BridgeResponse = z.infer<typeof responseSchema>
export type BridgeEvent = z.infer<typeof eventSchema>
export type BridgeMessage = z.infer<typeof messageSchema>

/** Parse an unknown value into a BridgeMessage, or return null if it is not one. */
export function parseMessage(value: unknown): BridgeMessage | null {
  const result = messageSchema.safeParse(value)
  return result.success ? result.data : null
}

let counter = 0
export function nextId(prefix = 'r'): string {
  counter += 1
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`
}
