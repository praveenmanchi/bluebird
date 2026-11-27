// Bluebird Cloud: the broker on Cloudflare Workers. Same app.ts as the Node server
// (server.ts); records live in Durable Objects (durable.ts says why).
//
//   npm run connect:worker   runs it locally with wrangler (secrets from tools/connect/.dev.vars)
//   npm run connect:deploy   deploys tools/connect/wrangler.toml
//
// Secrets (never in the repo or wrangler.toml):
//   npx wrangler secret put CONNECT_ENCRYPTION_KEY -c tools/connect/wrangler.toml
//   npx wrangler secret put CONNECT_STATE_KEY -c tools/connect/wrangler.toml
//   …and the provider apps' client secrets, as listed in server.ts.
//
// Rate limits are counted per isolate (limits.ts); production adds Cloudflare rate-limit rules.
import { DurableObject } from 'cloudflare:workers'
import { CloudConfigError, connectFromWorkerEnv } from './cloud'
import { durableStore, recordCell, type RecordCell } from './durable'
import { analyticsEngine } from './events'
import type { Env } from './config'
import buildInfo from '../../build-info.json'
import pluginConfig from '../../plugin.config.json'

interface WorkerEnv {
  CONNECT_RECORDS: DurableObjectNamespace<ConnectRecord>
  /** Access-code logins (events.ts). Optional: without it, reports are accepted and dropped. */
  LOGIN_EVENTS?: AnalyticsEngineDataset
  [name: string]: unknown
}

/** One sign-in record. The broker calls these over RPC through durableStore. */
export class ConnectRecord extends DurableObject implements RecordCell {
  private readonly cell = recordCell(this.ctx.storage)
  put(value: string, ttlSeconds: number): Promise<void> { return this.cell.put(value, ttlSeconds) }
  get(): Promise<string | null> { return this.cell.get() }
  take(): Promise<string | null> { return this.cell.take() }
  delete(): Promise<void> { return this.cell.delete() }
  override async alarm(): Promise<void> { await this.ctx.storage.deleteAll() }
}

function log(message: string): void {
  console.log(`[connect] ${message}`)
}

/** Only the string settings: bindings like CONNECT_RECORDS aren't configuration. */
function stringsOf(env: WorkerEnv): Env {
  return Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

// Built on the first request and kept for the isolate's life: the environment doesn't
// change without a new deployment, and the rate limiter needs to live across requests.
let handler: ((req: Request) => Promise<Response>) | undefined

function build(env: WorkerEnv): (req: Request) => Promise<Response> {
  const records = env.CONNECT_RECORDS
  const store = durableStore((name) => records.get(records.idFromName(name)) as unknown as RecordCell)
  // Only brands this build of the plugin has, so a forged report can't invent new ones.
  const analytics = env.LOGIN_EVENTS ? { sink: analyticsEngine(env.LOGIN_EVENTS), brands: Object.keys(pluginConfig.brand.brands) } : undefined
  return connectFromWorkerEnv(stringsOf(env), store, `${buildInfo.version}`, log, analytics)
}

export default {
  async fetch(req, env) {
    try {
      handler ??= build(env)
    } catch (error: unknown) {
      // Config errors name the missing setting, never its value.
      log(error instanceof CloudConfigError ? error.message : `startup failed (${error instanceof Error ? error.name : 'unknown'})`)
      return new Response(JSON.stringify({ error: 'Bluebird Connect is not configured.' }), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
    }
    const out = await handler(req)
    // Paths only: query strings carry keys, codes and state.
    if (req.method !== 'OPTIONS') log(`${req.method} ${new URL(req.url).pathname} → ${out.status}`)
    return out
  },
} satisfies ExportedHandler<WorkerEnv>
