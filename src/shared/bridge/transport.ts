import type { BridgeMessage } from './messages'

/** Minimal duplex channel. Every dev mode implements this once. */
export interface Transport {
  send(message: BridgeMessage): void
  subscribe(listener: (message: BridgeMessage) => void): () => void
  /** Optional connection status stream (live/WebSocket mode). */
  onStatus?(listener: (status: TransportStatus) => void): () => void
}

export type TransportStatus = 'connecting' | 'connected' | 'disconnected'
