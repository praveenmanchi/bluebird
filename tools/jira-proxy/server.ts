// Local Jira proxy for the Jira tab: `npm run jira:proxy`, then set
// Settings › Jira Integration › Proxy URL to http://localhost:8787.
// See proxy.ts for why it exists and what it forwards.
//   JIRA_PROXY_PORT   port (default 8787 — the one manifest.json's devAllowedDomains permits)
//   JIRA_PROXY_HOSTS  extra https hosts for Jira Server / Data Center, comma separated
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { handleProxyRequest, MAX_BODY_BYTES, parseHosts } from './proxy'

const PORT = Number(process.env.JIRA_PROXY_PORT ?? 8787)
const EXTRA_HOSTS = parseHosts(process.env.JIRA_PROXY_HOSTS)
// Both loopbacks: Figma's Chromium resolves localhost to 127.0.0.1, Node may pick ::1 (see tools/relay).
const LOOPBACKS = ['127.0.0.1', '::1'] as const

function log(message: string): void {
  console.log(`[jira-proxy] ${message}`)
}

/** The request body, or null once it passes the size limit (the stream is then destroyed). */
async function readBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) { req.destroy(); return null }
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]))
  const method = req.method ?? 'GET'
  const body = method === 'GET' || method === 'OPTIONS' ? undefined : await readBody(req)
  if (body === null) { res.writeHead(413, { 'access-control-allow-origin': '*' }); res.end(); return }
  const out = await handleProxyRequest({ method, url: req.url ?? '/', headers, body }, EXTRA_HOSTS, fetch)
  // Never log the Authorization header or bodies: they carry the API token and ticket content.
  if (method !== 'OPTIONS') log(`${method} ${(req.url ?? '').split('?')[0]} → ${out.status}`)
  res.writeHead(out.status, out.headers)
  res.end(out.body)
}

for (const host of LOOPBACKS) {
  const server = createServer((req, res) => {
    onRequest(req, res).catch((error: unknown) => {
      log(`unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      if (!res.headersSent) res.writeHead(500, { 'access-control-allow-origin': '*' })
      res.end()
    })
  })
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' || error.code === 'EAFNOSUPPORT') log(`could not bind ${host}:${PORT}: ${error.code}`)
    else throw error
  })
  server.listen(PORT, host, () => log(`listening on http://${host.includes(':') ? `[${host}]` : host}:${PORT}`))
}
log(`forwarding to *.atlassian.net${EXTRA_HOSTS.length ? ` and ${EXTRA_HOSTS.join(', ')}` : ''}`)
