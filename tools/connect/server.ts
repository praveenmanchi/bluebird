// Bluebird Connect on Node: `npm run connect:dev` locally, and the entry point
// of the Gateway image later (roadmap Phase 6). Bluebird Cloud runs the same
// app.ts on its host instead.
//
// Try it in the plugin: run this, then Settings › GitHub (or Jira) › "Use a
// company gateway" → http://localhost:8788, then Sign in.
//
//   CONNECT_PORT            port (default 8788, allowed in manifest devAllowedDomains)
//   CONNECT_PUBLIC_URL      address the browser uses (default http://localhost:<port>)
//   CONNECT_ENCRYPTION_KEY  ≥ 32 chars; a throwaway one is made when unset (dev only)
//   CONNECT_STATE_KEY       ≥ 32 chars; same
//   CONNECT_FAKE_PROVIDER   "1" serves the fake provider for github, jira and bitbucket (connect:dev sets it;
//                           off by default, and refused unless CONNECT_ENV is development or staging)
//   GITHUB_APP_CLIENT_ID    Bluebird's GitHub App (roadmap §5 A3). With the secret set, GitHub sign-in is
//   GITHUB_APP_CLIENT_SECRET  real; the fake stays for the other services. For local runs, add
//   GITHUB_APP_SLUG           http://localhost:8788/auth/github/callback to the app's callback URLs.
//   ATLASSIAN_CLIENT_ID     Bluebird's Atlassian 3LO app (§5 A4): Sign in with Atlassian for Jira Cloud.
//   ATLASSIAN_CLIENT_SECRET   Callback: http://localhost:8788/auth/jira/callback
//   BITBUCKET_CLIENT_ID     Bluebird's Bitbucket OAuth consumer key + secret (§5 A7).
//   BITBUCKET_CLIENT_SECRET   Callback: http://localhost:8788/auth/bitbucket/callback
//   JIRA_RELAY              "off" turns the Jira relay off (on by default: *.atlassian.net only)
//   JIRA_RELAY_HOSTS        extra Jira Data Center hosts the relay may reach (a gateway's own)
//                           Put them in .env (git-ignored), never in the repo.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createConnect } from './app'
import { randomKey } from './crypto'
import { memoryStore } from './store'
import { describeProviders, jiraRelayFromEnv, providersFromEnv } from './config'
import buildInfo from '../../build-info.json' with { type: 'json' }

const PORT = Number(process.env.CONNECT_PORT ?? 8788)
const PUBLIC_URL = process.env.CONNECT_PUBLIC_URL ?? `http://localhost:${PORT}`
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(PUBLIC_URL)
const MAX_BODY_BYTES = 64_000
// Both loopbacks: Figma's Chromium resolves localhost to 127.0.0.1, Node may pick ::1 (see tools/relay).
const LOOPBACKS = ['127.0.0.1', '::1'] as const

function log(message: string): void {
  console.log(`[connect] ${message}`)
}

function secret(name: string): string {
  const value = process.env[name]
  if (value) return value
  log(`${name} not set: using a throwaway key (sign-ins don't survive a restart)`)
  return randomKey()
}

const providers = providersFromEnv(process.env, PUBLIC_URL)
const jiraRelay = jiraRelayFromEnv(process.env)

const handle = createConnect({
  publicUrl: PUBLIC_URL,
  encryptionKey: secret('CONNECT_ENCRYPTION_KEY'),
  stateKey: secret('CONNECT_STATE_KEY'),
  store: memoryStore(),
  providers,
  version: `${buildInfo.version}`,
  // The socket's address, not a header the caller could set.
  clientIp: (req) => req.headers.get('x-connect-remote') ?? 'unknown',
  // Figma's null origin, plus the plugin dev harness when this broker runs on localhost.
  allowOrigin: (origin) => origin === 'null' || (LOCAL && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)),
  jiraRelay,
  log,
})

async function readBody(req: IncomingMessage): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) { req.destroy(); return null }
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET'
  const body = method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? undefined : await readBody(req)
  if (body === null) { res.writeHead(413); res.end(); return }
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && key !== 'x-connect-remote') headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  headers.set('x-connect-remote', req.socket.remoteAddress ?? 'unknown')
  const out = await handle(new Request(new URL(req.url ?? '/', PUBLIC_URL), { method, headers, body: body ? new Uint8Array(body) : undefined }))
  // Paths only: query strings carry keys, codes and state.
  if (method !== 'OPTIONS') log(`${method} ${(req.url ?? '').split('?')[0]} → ${out.status}`)
  res.writeHead(out.status, Object.fromEntries(out.headers))
  res.end(Buffer.from(await out.arrayBuffer()))
}

for (const host of LOOPBACKS) {
  const server = createServer((req, res) => {
    onRequest(req, res).catch((error: unknown) => {
      log(`unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    })
  })
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' || error.code === 'EAFNOSUPPORT') log(`could not bind ${host}:${PORT}: ${error.code}`)
    else throw error
  })
  server.listen(PORT, host, () => log(`listening on http://${host.includes(':') ? `[${host}]` : host}:${PORT}`))
}
log(describeProviders(providers))
log(jiraRelay ? `Jira relay on: *.atlassian.net${jiraRelay.extraHosts.length ? `, ${jiraRelay.extraHosts.join(', ')}` : ''}` : 'Jira relay off')
