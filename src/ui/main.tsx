import { render } from 'preact'
import { App } from '@shell/App'
import { createRpcClient, createPostMessageTransport, createWebSocketTransport, createMockTransport } from '@shared/bridge'
import { brand } from '@shared/config'
import type { Transport } from '@shared/bridge'
import { mockHandlers } from '../../tests/mocks/handlers'
import './index.css'

// Mode selection:
//   inside Figma            → postMessage (production)
//   ?mode=mock  (browser)   → in-process fixtures, no Figma needed
//   ?mode=live  (browser)   → WebSocket relay to the bridge plugin in Figma
type Mode = 'figma' | 'mock' | 'live'

function detectMode(): Mode {
  const param = new URLSearchParams(location.search).get('mode')
  if (param === 'mock' || param === 'live') return param
  return window.parent !== window ? 'figma' : 'mock'
}

function createTransport(mode: Mode): Transport {
  if (mode === 'figma') return createPostMessageTransport()
  if (mode === 'live') {
    const token = new URLSearchParams(location.search).get('token') ?? undefined
    return createWebSocketTransport({ url: 'ws://127.0.0.1:4001', role: 'browser', token })
  }
  return createMockTransport(mockHandlers)
}

const mode = detectMode()
// Generated brand CSS is scoped to [data-brand]; the sandbox resolver may still override values at runtime.
document.documentElement.dataset.brand = brand.id
const transport = createTransport(mode)
const client = createRpcClient(transport)
document.title = mode === 'figma' ? 'Bluebird' : `Bluebird · ${mode}`
render(<App client={client} transport={transport} />, document.getElementById('root')!)
