// The dev server's plugin.config.json endpoint (tools/dev-config/vite-plugin.ts).
const ENDPOINT = '/__bluebird/config'

interface Reply { ok: boolean; config?: unknown; error?: string }

async function call(init?: RequestInit): Promise<unknown> {
  const res = await fetch(ENDPOINT, init)
  const reply = await res.json().catch(() => null) as Reply | null
  if (!reply) throw new Error(`The dev server answered ${res.status} without JSON`)
  if (!res.ok || !reply.ok) throw new Error(reply.error ?? `The dev server answered ${res.status}`)
  return reply.config
}

export const loadPluginConfig = (): Promise<unknown> => call()

/** Writes the patch; resolves to the config as stored. */
export const savePluginConfig = (patch: unknown): Promise<unknown> =>
  call({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })

// Deployment: multi-brand or one brand, and each brand's Figma plugin id/name (tools/dev-config/config-api.ts › DeployPatch).
const DEPLOY_ENDPOINT = '/__bluebird/deploy'

export interface DeployPatch {
  deploy: { mode: 'multi' } | { mode: 'single'; brand: string }
  figmaPlugin?: Record<string, { id?: string; name?: string } | null>
}

/** Writes the deployment; resolves to the config as stored. */
export async function saveDeployment(patch: DeployPatch): Promise<unknown> {
  const res = await fetch(DEPLOY_ENDPOINT, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  const reply = await res.json().catch(() => null) as Reply | null
  if (!reply) throw new Error(`The dev server answered ${res.status} without JSON`)
  if (!res.ok || !reply.ok) throw new Error(reply.error ?? `The dev server answered ${res.status}`)
  return reply.config
}

// `npm run build` started from the page (tools/dev-config/build-runner.ts).
const BUILD_ENDPOINT = '/__bluebird/build'

export type BuildState =
  | { status: 'idle' }
  | { status: 'running'; startedAt: string; output: string }
  | { status: 'passed' | 'failed'; startedAt: string; finishedAt: string; exitCode: number | null; output: string; summary?: string }

interface BuildReply { ok: boolean; build?: BuildState; error?: string }

async function buildCall(init?: RequestInit): Promise<BuildState> {
  const res = await fetch(BUILD_ENDPOINT, init)
  const reply = await res.json().catch(() => null) as BuildReply | null
  if (!reply?.build) throw new Error(reply?.error ?? `The dev server answered ${res.status}`)
  return reply.build
}

export const getBuild = (): Promise<BuildState> => buildCall()

/** `build` makes dist/; `package` builds and then zips it with its manifest into release/. */
export type BuildScript = 'build' | 'package'

/** Starts a build, or resolves to the one already running. */
export const startBuild = (script: BuildScript = 'build'): Promise<BuildState> =>
  buildCall({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script }) })
