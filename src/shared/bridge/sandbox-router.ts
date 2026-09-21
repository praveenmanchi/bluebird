import { parseMessage, type BridgeMessage, type BridgeRequest } from './messages'

/** Everything a handler may need from the host, injected so handlers stay testable. */
export interface HandlerContext {
  /** Push a fire-and-forget event to the UI (progress, partial results). */
  emit(type: string, payload: unknown): void
}

export type Handler<TPayload = unknown, TResult = unknown> = (payload: TPayload, ctx: HandlerContext) => Promise<TResult> | TResult
export type HandlerMap = Record<string, Handler<never, unknown>>

export interface Router {
  handle(raw: unknown): Promise<void>
}

/**
 * Routes incoming requests to the handler registered for their exact type.
 * Every outcome becomes a response envelope: handlers never leak exceptions.
 */
export function createRouter(handlers: HandlerMap, send: (message: BridgeMessage) => void): Router {
  const ctx: HandlerContext = {
    emit: (type, payload) => send({ kind: 'event', type, payload }),
  }

  async function dispatch(request: BridgeRequest): Promise<void> {
    const handler = handlers[request.type]
    if (!handler) {
      send({ kind: 'response', id: request.id, ok: false, error: `No handler for "${request.type}"` })
      return
    }
    try {
      const data = await (handler as Handler)(request.payload, ctx)
      send({ kind: 'response', id: request.id, ok: true, data })
    } catch (error: unknown) {
      send({ kind: 'response', id: request.id, ok: false, error: errorMessage(error) })
    }
  }

  return {
    async handle(raw: unknown): Promise<void> {
      const message = parseMessage(raw)
      if (!message || message.kind !== 'request') return
      await dispatch(message)
    },
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unexpected error'
}
