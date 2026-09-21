// Local WebSocket relay for live mode.
//   browser UI (role=browser)  ⇄  relay  ⇄  bridge page inside Figma (role=figma)
// Binds to 127.0.0.1 only. Optional shared token: `npm run dev:relay -- --token abc`.
import { WebSocketServer, WebSocket } from 'ws'
import { randomBytes } from 'node:crypto'

const PORT = 4001
const args = process.argv.slice(2)
const tokenIndex = args.indexOf('--token')
const token = tokenIndex >= 0 ? (args[tokenIndex + 1] ?? randomBytes(6).toString('hex')) : null

type Role = 'browser' | 'figma'
const peers: Record<Role, WebSocket | null> = { browser: null, figma: null }

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT })

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`)
  const role = url.searchParams.get('role')
  if (role !== 'browser' && role !== 'figma') return socket.close(4000, 'role must be browser or figma')
  if (token && url.searchParams.get('token') !== token) return socket.close(4001, 'bad token')

  peers[role]?.close(4002, 'replaced by a newer connection')
  peers[role] = socket
  log(`${role} connected`)

  const target: Role = role === 'browser' ? 'figma' : 'browser'
  socket.on('message', (data) => {
    const peer = peers[target]
    if (peer?.readyState === WebSocket.OPEN) peer.send(data.toString())
    else log(`dropped message from ${role}: ${target} not connected`)
  })
  socket.on('close', () => {
    if (peers[role] === socket) peers[role] = null
    log(`${role} disconnected`)
  })
})

console.log(`[relay] ws://127.0.0.1:${PORT}${token ? `  token=${token}` : '  (no token)'}`)
console.log('[relay] 1. In Figma: Plugins → Development → bluebird → "Dev: connect to browser"')
console.log(`[relay] 2. In browser: http://localhost:5173/?mode=live${token ? `&token=${token}` : ''}`)

function log(message: string) { console.log(`[relay ${new Date().toLocaleTimeString()}] ${message}`) }
