import { render } from 'preact'
import { App } from '@shell/App'
import { createRpcClient, createPostMessageTransport, createWebSocketTransport, createMockTransport } from '@shared/bridge'
import { brand, personas } from '@shared/config'
import type { Transport } from '@shared/bridge'
import { createMockHandlers } from '../../tests/mocks/handlers'
import { ASK_PERSONA, readDevParams } from './dev-params'
import { connection, selectPersona, windowSize } from '@shell/state'
import { clampWindow } from '@shared/config'
import './index.css'

// Mode selection:
//   inside Figma            → postMessage (production)
//   ?mode=mock  (browser)   → in-process fixtures, no Figma needed
//   ?mode=live  (browser)   → WebSocket relay to the bridge plugin in Figma
type Mode = 'figma' | 'mock' | 'live'

function detectMode(): Mode {
  const param = new URLSearchParams(location.search).get('mode')
  if (param === 'mock' || param === 'live') return param
  // Inside Figma the UI is an iframe; the dev harness (dev.html) embeds it with ?embed=1.
  return window.parent !== window && !new URLSearchParams(location.search).has('embed') ? 'figma' : 'mock'
}

const mode = detectMode()
const dev = mode === 'mock' ? readDevParams() : null

// A bare browser visit renders the plugin at full window size, which is not what
// Figma shows. Send it to the dev harness, which frames it at the real plugin size.
if (import.meta.env.DEV && dev && !dev.embed && window.top === window) {
  location.replace(`/dev.html${location.search}`)
}

function createTransport(): Transport {
  if (mode === 'figma') return createPostMessageTransport()
  if (mode === 'live') {
    const token = new URLSearchParams(location.search).get('token') ?? undefined
    return createWebSocketTransport({ url: 'ws://localhost:4001', role: 'browser', token })
  }
  return createMockTransport(createMockHandlers({
    scenario: dev?.scenario,
    brandId: dev?.brand ?? brand.id,
    sessionBrand: dev?.session === 'none' ? null : dev?.session,
    persona: dev?.persona === ASK_PERSONA ? null : dev?.persona,
    persist: true,
    onResize: (size) => window.parent.postMessage({ type: 'bb:resize', ...size }, '*'),
  }))
}

// Generated brand CSS is scoped to [data-brand]; the sandbox resolver may still override values at runtime.
// The session flow re-stamps this once session:status answers; the config default covers the login screen.
document.documentElement.dataset.brand = dev?.brand ?? brand.id
if (dev) {
  connection.value = dev.status
  if (dev.persona && personas.some((p) => p.id === dev.persona)) selectPersona(dev.persona)
  if (dev.embed) {
    window.addEventListener('message', (e: MessageEvent) => {
      const d = e.data as { type?: string; width?: number; height?: number } | null
      if (d?.type === 'bb:set-size' && typeof d.width === 'number' && typeof d.height === 'number') windowSize.value = clampWindow({ width: d.width, height: d.height })
    })
  }
}

const transport = createTransport()
const client = createRpcClient(transport)
document.title = mode === 'figma' ? 'Bluebird' : `Bluebird · ${mode}`
render(<App client={client} transport={transport} />, document.getElementById('root')!)
