// Local WebSocket relay for live mode.
//   browser UI (role=browser)  ⇄  relay  ⇄  bridge page inside Figma (role=figma)
// Binds to BOTH loopback addresses (clients dial ws://localhost:4001 — Figma's manifest validator
// rejects IP-form ws URLs). `host: 'localhost'` resolved to ::1 only, so Node clients connected
// while Figma's Chromium sandbox — which resolves localhost to 127.0.0.1 — got ECONNREFUSED and
// the bridge silently never appeared. Listening on both removes the asymmetry.
// Optional shared token: `npm run dev:relay -- --token abc`.
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

// 4001 is what manifest.json's devAllowedDomains permits; RELAY_PORT is for tests only.
const PORT = Number(process.env.RELAY_PORT ?? 4001)
const args = process.argv.slice(2)
const tokenIndex = args.indexOf('--token')
const token = tokenIndex >= 0 ? (args[tokenIndex + 1] ?? randomBytes(6).toString('hex')) : null

type Role = 'browser' | 'figma'
const peers: Record<Role, WebSocket | null> = { browser: null, figma: null }

const wss = new WebSocketServer({ noServer: true })
const LOOPBACKS = ['127.0.0.1', '::1'] as const
const listening: string[] = []
for (const host of LOOPBACKS) {
  const http = createServer()
  http.on('upgrade', (request, socket, head) => wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request)))
  http.on('error', (error: NodeJS.ErrnoException) => {
    // One of the two families may be unavailable; that is fine as long as the other bound.
    if (error.code === 'EADDRINUSE' || error.code === 'EAFNOSUPPORT') log(`could not bind ${host}: ${error.code}`)
    else throw error
  })
  http.listen(PORT, host, () => { listening.push(host); log(`listening on ${host}:${PORT}`) })
}

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)
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

console.log(`[relay] ws://localhost:${PORT}${token ? `  token=${token}` : '  (no token)'}`)
console.log('[relay] 1. npm run dev:live, then run the plugin in Figma (it opens the live bridge panel)')
console.log(`[relay] 2. In browser: http://localhost:5173/?mode=live${token ? `&token=${token}` : ''}`)

function log(message: string) { console.log(`[relay ${new Date().toLocaleTimeString()}] ${message}`) }
