import { parseMessage, type BridgeMessage } from '../messages'
import type { Transport, TransportStatus } from '../transport'

export interface WebSocketTransportOptions {
  url: string
  role: 'browser' | 'figma'
  token?: string
  reconnectMs?: number
}

/**
 * Live-mode transport. Used by BOTH ends of the relay:
 *   - the browser UI (role=browser) sends requests, receives responses/events
 *   - the bridge page inside Figma (role=figma) forwards the opposite direction
 * Queues messages while disconnected and reconnects automatically.
 */
export function createWebSocketTransport(options: WebSocketTransportOptions): Transport {
  const listeners = new Set<(m: BridgeMessage) => void>()
  const statusListeners = new Set<(s: TransportStatus) => void>()
  const queue: BridgeMessage[] = []
  let socket: WebSocket | null = null
  const closed = false

  const url = new URL(options.url)
  url.searchParams.set('role', options.role)
  if (options.token) url.searchParams.set('token', options.token)

  function setStatus(status: TransportStatus) { statusListeners.forEach((fn) => fn(status)) }

  function connect() {
    if (closed) return
    setStatus('connecting')
    const ws = new WebSocket(url.toString())
    socket = ws
    ws.onopen = () => {
      setStatus('connected')
      while (queue.length) ws.send(JSON.stringify(queue.shift()))
    }
    ws.onmessage = (event) => {
      const parsed = safeParse(event.data)
      if (parsed) listeners.forEach((fn) => fn(parsed))
    }
    ws.onclose = () => {
      setStatus('disconnected')
      socket = null
      if (!closed) setTimeout(connect, options.reconnectMs ?? 1500)
    }
    ws.onerror = () => ws.close()
  }
  connect()

  return {
    send(message) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
      else queue.push(message)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    onStatus(listener) {
      statusListeners.add(listener)
      return () => { statusListeners.delete(listener) }
    },
  }
}

function safeParse(data: unknown): BridgeMessage | null {
  if (typeof data !== 'string') return null
  try { return parseMessage(JSON.parse(data)) } catch { return null }
}
