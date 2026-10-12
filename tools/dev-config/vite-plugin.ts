// Vite dev-server middleware behind dev.html › Plugin configuration.
//   GET  /__bluebird/config → plugin.config.json as stored
//   PUT  /__bluebird/config → apply a BrandPatch, validate, write the file
//   GET  /__bluebird/build  → the last `npm run build` started from the page
//   POST /__bluebird/build  → start `npm run build` (one at a time)
// Serve mode only: `vite build` never registers it, so nothing here ships.
import { readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname } from 'node:path'
import type { Plugin } from 'vite'
import { applyBrandPatch, CONFIG_ENDPOINT, formatConfig } from './config-api'
import { BUILD_ENDPOINT, createBuildRunner, type BuildRunner } from './build-runner'

const MAX_BODY_BYTES = 1_000_000

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) { reject(new Error('Request body too large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Only the page this dev server serves may write: another site open in the browser can't reach the file. */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (!origin) return false
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/** `build` defaults to `npm run build` in the config file's folder; tests pass a fake. */
export function devConfigPlugin(configPath: string, build: BuildRunner = createBuildRunner(dirname(configPath))): Plugin {
  return {
    name: 'bluebird-dev-config',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(CONFIG_ENDPOINT, (req, res) => {
        void (async () => {
          try {
            if (req.method === 'GET') { send(res, 200, { ok: true, config: JSON.parse(readFileSync(configPath, 'utf8')) as unknown }); return }
            if (req.method !== 'PUT') { send(res, 405, { ok: false, error: 'Use GET or PUT.' }); return }
            if (!sameOrigin(req)) { send(res, 403, { ok: false, error: 'Writes are only accepted from this dev server’s own pages.' }); return }
            if (!req.headers['content-type']?.startsWith('application/json')) { send(res, 415, { ok: false, error: 'Send JSON.' }); return }
            const patch = JSON.parse(await readBody(req)) as unknown
            const next = applyBrandPatch(JSON.parse(readFileSync(configPath, 'utf8')), patch)
            writeFileSync(configPath, formatConfig(next))
            send(res, 200, { ok: true, config: next })
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'The configuration couldn’t be saved.'
            server.config.logger.warn(`[bluebird-dev-config] ${message}`)
            send(res, 400, { ok: false, error: message })
          }
        })()
      })
      server.middlewares.use(BUILD_ENDPOINT, (req, res) => {
        if (req.method === 'GET') { send(res, 200, { ok: true, build: build.state() }); return }
        if (req.method !== 'POST') { send(res, 405, { ok: false, error: 'Use GET or POST.' }); return }
        // Same gate as config writes: this runs a command on the machine.
        if (!sameOrigin(req)) { send(res, 403, { ok: false, error: 'Builds can only be started from this dev server’s own pages.' }); return }
        if (!req.headers['content-type']?.startsWith('application/json')) { send(res, 415, { ok: false, error: 'Send JSON.' }); return }
        const started = build.start()
        send(res, started ? 202 : 409, { ok: started, build: build.state(), ...(started ? {} : { error: 'A build is already running.' }) })
      })
    },
  }
}
