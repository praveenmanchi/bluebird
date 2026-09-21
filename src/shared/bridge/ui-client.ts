import { nextId, type BridgeMessage } from './messages'
import type { Transport } from './transport'

export class BridgeError extends Error {
  override readonly name = 'BridgeError'
}

interface Pending {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface RpcClient {
  /** Send a request and await its typed response. Rejects on timeout or handler error. */
  call<TResult = unknown>(type: string, payload?: unknown, timeoutMs?: number): Promise<TResult>
  /** Subscribe to fire-and-forget events from the sandbox (progress, selection changes). */
  on<TPayload = unknown>(type: string, listener: (payload: TPayload) => void): () => void
}

const DEFAULT_TIMEOUT_MS = 30_000

/** Promise-based RPC over any Transport. Used by every tab's UI. */
export function createRpcClient(transport: Transport): RpcClient {
  const pending = new Map<string, Pending>()
  const listeners = new Map<string, Set<(payload: unknown) => void>>()

  transport.subscribe((message: BridgeMessage) => {
    if (message.kind === 'response') {
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      clearTimeout(entry.timer)
      if (message.ok) entry.resolve(message.data)
      else entry.reject(new BridgeError(message.error ?? 'Unknown bridge error'))
      return
    }
    if (message.kind === 'event') {
      listeners.get(message.type)?.forEach((fn) => fn(message.payload))
    }
  })

  return {
    call<TResult>(type: string, payload: unknown = null, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<TResult> {
      const id = nextId()
      return new Promise<TResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new BridgeError(`Request "${type}" timed out after ${timeoutMs}ms`))
        }, timeoutMs)
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer })
        transport.send({ kind: 'request', id, type, payload })
      })
    },
    on<TPayload>(type: string, listener: (payload: TPayload) => void): () => void {
      const set = listeners.get(type) ?? new Set()
      set.add(listener as (p: unknown) => void)
      listeners.set(type, set)
      return () => { set.delete(listener as (p: unknown) => void) }
    },
  }
}
