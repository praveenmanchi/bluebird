// The "bridge" UI: shown inside Figma in live mode. It does no rendering of
// its own — it forwards messages between the WebSocket relay and the sandbox.
//   browser UI ⇄ relay ⇄ (this page) ⇄ sandbox
import { createWebSocketTransport, parseMessage } from '@shared/bridge'
import type { TransportStatus } from '@shared/bridge'

const statusEl = document.getElementById('status')!
const tokenEl = document.getElementById('token') as HTMLInputElement
const connectEl = document.getElementById('connect') as HTMLButtonElement

function connect(token: string | undefined) {
  const ws = createWebSocketTransport({ url: 'ws://localhost:4001', role: 'figma', token })
  ws.onStatus?.((s: TransportStatus) => {
    statusEl.textContent = s
    statusEl.dataset.status = s
  })
  // relay → sandbox
  ws.subscribe((message) => window.parent.postMessage({ pluginMessage: message }, '*'))
  // sandbox → relay
  window.addEventListener('message', (event: MessageEvent) => {
    const parsed = parseMessage(event.data?.pluginMessage)
    if (parsed) ws.send(parsed)
  })
}

connectEl.addEventListener('click', () => {
  const token = tokenEl.value.trim() || undefined
  window.parent.postMessage({ pluginMessage: { kind: 'event', type: 'bridge:save-token', payload: token ?? '' } }, '*')
  connect(token)
  connectEl.disabled = true
})

// Ask the sandbox for a previously saved token, then auto-connect.
window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data?.pluginMessage
  if (msg?.kind === 'event' && msg.type === 'bridge:token') {
    tokenEl.value = typeof msg.payload === 'string' ? msg.payload : ''
    connectEl.click()
  }
}, { once: true })
window.parent.postMessage({ pluginMessage: { kind: 'event', type: 'bridge:load-token', payload: null } }, '*')
