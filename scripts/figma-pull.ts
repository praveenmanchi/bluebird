// Pull the Figma snapshot into figma/*.json.
//
//   npm run figma:pull                          plugin backend (default): through the live-mode relay
//   npm run figma:pull -- --rest                REST backend, tier auto-detected
//   npm run figma:pull -- --rest --tier enterprise     fail instead of falling back
//   npm run figma:pull -- --rest --tier professional   skip /variables/local even when allowed
//   npm run figma:pull -- --rest --version <id>        read one saved Figma version
//   npm run figma:pull -- --rest --fix-manifest        rewrite manifest ids of sets that moved
//
// plugin backend — every Figma plan. Needs the relay and the bridge page running (README "Live
//   mode"); the sandbox handler `figma:snapshot` runs src/shared/brand/extract.ts inside Figma.
//
// REST backend — see scripts/figma-rest/index.ts. Enterprise tier is fully headless (variables
//   and metadata from /variables/local); professional tier reads components, bindings, sizes,
//   coverage and icons over REST and takes variable values from the relay or the committed file.
//
// Also imported by scripts/figma-diff.ts, which pulls into memory and never writes.
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { WebSocket } from 'ws'
import type { ComponentsSnapshot, IconsSnapshot, TokenSnapshot } from '../src/shared/brand/snapshot'
import type { ExtractManifest } from '../src/shared/brand/extract'
import { pullRest, type ResolvedTier, type Tier } from './figma-rest'
import type { Reconciliation } from './figma-rest/discover'

export const ROOT = resolve(import.meta.dirname, '..')

export type Backend = 'plugin' | 'rest'
export interface PullOptions {
  backend: Backend
  /** Relay auth token (`--token`). */
  token?: string
  root?: string
  /** Relay response timeout. Short when the relay is only a fallback for variables. */
  timeoutMs?: number
  /** REST tier (`--tier`); auto-detected when omitted. */
  tier?: Tier
  /** Figma file version id (`--version`); REST only. */
  version?: string
}

export interface Snapshot {
  tokens: TokenSnapshot
  components: ComponentsSnapshot
  icons: IconsSnapshot
  /** Which extractor produced the component data. The two do not describe a file identically —
   *  extract.ts walks into instances and records their overrides, the REST describe() stops at the
   *  instance — so comparing a snapshot from one against a snapshot from the other is meaningless
   *  below set level. figma-diff refuses to do it. */
  source?: 'figma-plugin' | 'figma-rest'
  /** True when `tokens` came from the committed file because no live source was reachable. */
  tokensStale?: boolean
  /** True when /variables/local was denied, so bound properties could not be resolved to variable
   *  names and came back as `lib:VariableID:…` placeholders. Every binding then looks rebound. */
  bindingsUnnamed?: boolean
  /** REST only: which tier ran, and why it was not enterprise. */
  tier?: ResolvedTier
  tierReason?: string
  /** REST only: manifest vs the sets actually in the file. */
  reconciliation?: Reconciliation
  /** REST only: binding ids no variable index could name (library variables, stale ids). */
  unknownVariableIds?: string[]
}

type Manifest = ExtractManifest & { iconSet: ExtractManifest['iconSet']; fileName?: string }

/** The relay reads whichever file has the bridge open and stamps the manifest's key on the result,
 *  so without this a pull from the wrong tab would overwrite the snapshot with another file. */
export function assertExpectedFile(manifest: { fileName?: string }, openFile: string | undefined): void {
  if (!manifest.fileName || openFile === manifest.fileName) return
  throw new Error(`The bridge is open in "${openFile ?? 'an unnamed file'}", but figma/manifest.json expects "${manifest.fileName}". Run the plugin in that file, or update fileName and fileKey in the manifest if the source really moved.`)
}

const TIERS: readonly Tier[] = ['auto', 'enterprise', 'professional']

export function parseArgs(argv: string[]): PullOptions & { fixManifest: boolean } {
  const value = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
  const token = value('--token')
  const tier = value('--tier')
  const version = value('--version')
  if (tier !== undefined && !TIERS.includes(tier as Tier)) throw new Error(`--tier must be one of ${TIERS.join(', ')}`)
  // --tier / --version only mean something to the REST backend, so they imply it.
  const rest = argv.includes('--rest') || tier !== undefined || version !== undefined
  return {
    backend: rest ? 'rest' : 'plugin', fixManifest: argv.includes('--fix-manifest'),
    ...(token ? { token } : {}), ...(tier ? { tier: tier as Tier } : {}), ...(version ? { version } : {}),
  }
}

export function readManifest(root = ROOT): Manifest {
  return JSON.parse(readFileSync(resolve(root, 'figma/manifest.json'), 'utf8')) as Manifest
}

/** The snapshot as committed in figma/*.json — the baseline figma:diff compares against. */
export function readCommitted(root = ROOT): Snapshot {
  const read = <T>(rel: string) => JSON.parse(readFileSync(resolve(root, rel), 'utf8')) as T
  const tokens = read<TokenSnapshot>('figma/tokens.json')
  return {
    tokens,
    components: read<ComponentsSnapshot>('figma/components.json'),
    icons: read<IconsSnapshot>('figma/icons.json'),
    // Stamped so a copy of the committed snapshot keeps its extractor (see figma-diff layerDiffBlocker).
    source: tokens.source === 'figma-rest' ? 'figma-rest' : 'figma-plugin',
  }
}

export async function pullSnapshot(options: PullOptions): Promise<Snapshot> {
  const root = options.root ?? ROOT
  const manifest = readManifest(root)
  return options.backend === 'rest' ? pullRestSnapshot(manifest, root, options) : pullPlugin(manifest, options)
}

/** Fold the code-side bookkeeping the snapshot itself does not carry back into a freshly pulled one.
 *  Both the writer and the differ must do this or every run reports it as drift. */
export function mergeCommitted(snapshot: Snapshot, root = ROOT): Snapshot {
  const existingIcons = JSON.parse(readFileSync(resolve(root, 'figma/icons.json'), 'utf8')) as IconsSnapshot
  const existingComponents = JSON.parse(readFileSync(resolve(root, 'figma/components.json'), 'utf8')) as ComponentsSnapshot & { tiers?: unknown; standaloneIcons?: unknown }
  // Only the "Tab Icons" set is re-exported; glyphs exported by hand from other sets
  // (status, section, toolbar, principle… see docs) and the checkbox marks are kept.
  const icons: IconsSnapshot = {
    ...snapshot.icons,
    icons: { ...existingIcons.icons, ...snapshot.icons.icons },
    marks: Object.keys(snapshot.icons.marks).length ? snapshot.icons.marks : existingIcons.marks,
  }
  // Code-side bookkeeping (status/aliasOf per set, tiers, standalone icons) lives only in the committed file.
  // By id first; by code name when a set moved to a new node id (see --fix-manifest).
  const bookkeeping = new Map(existingComponents.sets.map((s) => [s.id, s]))
  const byCode = new Map(existingComponents.sets.map((s) => [s.code, s]))
  const sets = snapshot.components.sets.map((s) => {
    const prev = bookkeeping.get(s.id) ?? byCode.get(s.code)
    return { ...s, ...(prev?.status ? { status: prev.status } : {}), ...(prev?.aliasOf ? { aliasOf: prev.aliasOf } : {}), ...(prev?.dir ? { dir: prev.dir } : {}) }
  })
  const components = {
    ...snapshot.components,
    sets,
    ...(existingComponents.tiers ? { tiers: existingComponents.tiers } : {}),
    ...(existingComponents.standaloneIcons ? { standaloneIcons: existingComponents.standaloneIcons } : {}),
  }
  return { ...snapshot, components, icons }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const snapshot = mergeCommitted(await pullSnapshot(options))
  write('figma/tokens.json', snapshot.tokens)
  write('figma/components.json', snapshot.components)
  write('figma/icons.json', snapshot.icons)
  if (snapshot.reconciliation) reportReconciliation(snapshot.reconciliation, options.fixManifest)
  if (snapshot.unknownVariableIds?.length) console.warn(`[figma:pull] ${snapshot.unknownVariableIds.length} bound variable id(s) could not be named and were recorded as lib:<id>`)
  if (snapshot.tokensStale) console.warn('[figma:pull] variables were NOT refreshed (professional tier, relay unreachable) — figma/tokens.json values are unchanged')
  const tier = snapshot.tier ? ` (${snapshot.tier} tier)` : ''
  const version = snapshot.components.version ? ` · version ${snapshot.components.version}` : ''
  console.log(`[figma:pull] ${options.backend}${tier}: ${snapshot.tokens.collections.map((c) => `${c.name}=${c.variables.length}`).join(' ')} · ${snapshot.components.sets.length} sets · ${Object.keys(snapshot.icons.icons).length} icons${version}`)
  console.log('[figma:pull] next: npm run gen:tokens && npm run tokens:check')
}

/** Log what the manifest is out of step with; with --fix-manifest, follow sets that moved. */
function reportReconciliation(r: Reconciliation, fix: boolean) {
  for (const m of r.moved) console.warn(`[figma:pull] ${m.code}: "${m.figma}" moved ${m.from} → ${m.to}${fix ? ' (manifest updated)' : ' — pulled from the new id; run with --fix-manifest to record it'}`)
  if (r.unmapped.length) {
    console.warn(`[figma:pull] ${r.unmapped.length} component set(s) in Figma are not in figma/manifest.json:`)
    for (const u of r.unmapped) console.warn(`    ${u.id}  ${u.name}${u.section ? `  [${u.section}]` : ''}  ${u.variants} variant(s)`)
  }
  if (!fix || !r.moved.length) return
  const path = resolve(ROOT, 'figma/manifest.json')
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as ExtractManifest & Record<string, unknown>
  const to = new Map(r.moved.map((m) => [m.code, m.to]))
  const componentSets = manifest.componentSets.map((s) => (to.has(s.code) ? { ...s, id: to.get(s.code)! } : s))
  writeFileSync(path, `${JSON.stringify({ ...manifest, componentSets }, null, 2)}\n`)
}

function write(rel: string, data: unknown) {
  writeFileSync(resolve(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`)
}

// ------------------------------------------------------------ plugin backend

function pullPlugin(manifest: Manifest, options: PullOptions): Promise<Snapshot> {
  const url = new URL('ws://localhost:4001')
  url.searchParams.set('role', 'browser')
  if (options.token) url.searchParams.set('token', options.token)
  return new Promise((resolvePromise, reject) => {
    const ws = new WebSocket(url.toString())
    const id = `pull${Date.now().toString(36)}`
    let connected = false
    // The relay accepts us as `role=browser` whether or not Figma is on the other side, and
    // silently drops the request when it is not (tools/relay/server.ts). So a timeout after a
    // successful connect means the bridge is not open — a different fix from the relay being down.
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error(connected
        ? 'The relay is running but nothing answered from Figma — the bridge is not connected. Run npm run dev:live, then run the plugin in Figma desktop (it opens the live bridge panel).'
        : 'Could not reach the relay on ws://localhost:4001. Start it with `npm run dev:relay`.'))
    }, options.timeoutMs ?? 600_000)
    ws.on('open', () => { connected = true; ws.send(JSON.stringify({ kind: 'request', id, type: 'figma:snapshot', payload: manifest })) })
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as { kind: string; id?: string; ok?: boolean; data?: Snapshot; error?: string }
      if (message.kind !== 'response' || message.id !== id) return
      clearTimeout(timer)
      ws.close()
      if (!message.ok || !message.data) { reject(new Error(message.error ?? 'figma:snapshot failed')); return }
      try {
        assertExpectedFile(manifest, message.data.tokens.fileName)
        resolvePromise({ ...message.data, source: 'figma-plugin' })
      } catch (error) { reject(error) }
    })
    ws.on('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

// -------------------------------------------------------------- rest backend

async function pullRestSnapshot(manifest: Manifest, root: string, options: PullOptions): Promise<Snapshot> {
  const result = await pullRest(manifest, { tier: options.tier ?? 'auto', ...(options.version ? { version: options.version } : {}) }, {
    relay: async () => (await pullPlugin(manifest, { ...options, timeoutMs: 30_000 })).tokens,
    committed: () => { try { return readCommitted(root).tokens } catch { return undefined } },
  })
  return {
    tokens: result.tokens, components: result.components, icons: result.icons, source: 'figma-rest',
    tier: result.tier, ...(result.tierReason ? { tierReason: result.tierReason } : {}),
    reconciliation: result.reconciliation, unknownVariableIds: result.unknownVariableIds,
    ...(result.tokensStale ? { tokensStale: true } : {}), ...(result.bindingsUnnamed ? { bindingsUnnamed: true } : {}),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main().catch((error: unknown) => { console.error(`[figma:pull] ${error instanceof Error ? error.message : String(error)}`); process.exit(1) })
}
