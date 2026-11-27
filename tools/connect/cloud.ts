// Bluebird Cloud's settings, read from a Worker's environment (worker.ts). Kept apart from
// worker.ts so it can be tested in Node.
//
// Unlike server.ts there are no throwaway keys: each Worker isolate would make its own,
// and a sign-in started on one would fail on the next. Missing settings stop the Worker.
import { createConnect, type ConnectConfig } from './app'
import { describeProviders, jiraRelayFromEnv, providersFromEnv, type Env } from './config'
import type { Analytics } from './events'
import type { Store } from './store'

const LOCAL_URL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

export class CloudConfigError extends Error {
  override name = 'CloudConfigError'
}

function required(env: Env, name: string): string {
  const value = env[name]
  if (!value) throw new CloudConfigError(`${name} is not set. Add it with: npx wrangler secret put ${name} -c tools/connect/wrangler.toml`)
  if (value.length < 32) throw new CloudConfigError(`${name} must be at least 32 characters.`)
  return value
}

/** Checks the environment and builds the broker. Throws CloudConfigError, never logs a secret. */
export function connectFromWorkerEnv(env: Env, store: Store, version: string, log: (message: string) => void, analytics?: { sink: Analytics; brands: readonly string[] }): (req: Request) => Promise<Response> {
  const publicUrl = (env.CONNECT_PUBLIC_URL ?? '').replace(/\/+$/, '')
  if (!publicUrl.startsWith('https://') && !LOCAL_URL.test(publicUrl)) {
    throw new CloudConfigError('CONNECT_PUBLIC_URL must be the https address this Worker answers on (vars in tools/connect/wrangler.toml).')
  }
  const providers = providersFromEnv(env, publicUrl)
  const jiraRelay = jiraRelayFromEnv(env)
  log(describeProviders(providers))
  const config: ConnectConfig = {
    publicUrl,
    encryptionKey: required(env, 'CONNECT_ENCRYPTION_KEY'),
    stateKey: required(env, 'CONNECT_STATE_KEY'),
    store,
    providers,
    version,
    // Defaults: cf-connecting-ip for rate limits (Cloudflare sets it), Figma's null origin only.
    // `wrangler dev` adds the plugin dev harness on localhost, as server.ts does.
    ...(LOCAL_URL.test(publicUrl) ? { allowOrigin: (origin: string) => origin === 'null' || LOCAL_URL.test(origin) } : {}),
    ...(jiraRelay ? { jiraRelay } : {}),
    ...(analytics ? { analytics: analytics.sink, analyticsBrands: analytics.brands } : {}),
    log,
  }
  return createConnect(config)
}
