// REST backend for `npm run figma:pull -- --rest`, in two tiers:
//
//   enterprise    GET /variables/local works: live variable values + metadata, and every node
//                 binding named from the live index. Fully headless.
//   professional  /variables/local is denied (plan or token scope). Components, bindings, sizes,
//                 coverage and icons still come from REST; variable values come from the relay when
//                 it is up, otherwise from the committed figma/tokens.json (flagged tokensStale),
//                 and bindings are named from the ids that snapshot recorded.
//
// `auto` (the default) tries enterprise and drops to professional on a 403/404.
import type { ExtractManifest } from '../../src/shared/brand/extract'
import type { ComponentsSnapshot, IconsSnapshot, TokenSnapshot } from '../../src/shared/brand/snapshot'
import { describeSet, tablesOf, type DescribeContext } from './describe'
import { coverageRows, discoverSets, reconcile, type Reconciliation } from './discover'
import { FigmaHttpError, figmaGet, withVersion } from './http'
import { restIcons } from './icons'
import type { RestAlias, RestNode, RestNodesResponse } from './types'
import { fetchVariableIndex, namesFromTokens, restTokens, type VariableIndex } from './variables'

export type Tier = 'auto' | 'enterprise' | 'professional'
export type ResolvedTier = Exclude<Tier, 'auto'>

export interface RestManifest extends ExtractManifest { logoSet?: { id: string } }

export interface RestPullOptions {
  tier?: Tier
  /** Figma file version id to read instead of the latest. */
  version?: string
}

/** How the professional tier gets variable values when REST cannot. */
export interface TokenFallbacks {
  relay: () => Promise<TokenSnapshot>
  committed: () => TokenSnapshot | undefined
}

export interface RestPullResult {
  tier: ResolvedTier
  /** Why the pull ran below enterprise, for the log. */
  tierReason?: string
  tokens: TokenSnapshot
  components: ComponentsSnapshot
  icons: IconsSnapshot
  reconciliation: Reconciliation
  tokensStale?: boolean
  bindingsUnnamed?: boolean
  /** Variable ids a binding pointed at that no index could name. */
  unknownVariableIds: string[]
}

interface TokenSource { tier: ResolvedTier; tierReason?: string; tokens: TokenSnapshot; index?: VariableIndex; names: Map<string, string>; tokensStale?: boolean }

async function resolveTokens(manifest: RestManifest, options: RestPullOptions, fallbacks: TokenFallbacks, log: (m: string) => void): Promise<TokenSource> {
  const tier = options.tier ?? 'auto'
  let tierReason = 'forced with --tier professional'
  if (tier !== 'professional') {
    try {
      const index = await fetchVariableIndex(manifest.fileKey)
      return { tier: 'enterprise', tokens: restTokens(manifest, index, options.version), index, names: new Map() }
    } catch (error) {
      if (!(error instanceof FigmaHttpError) || (error.status !== 403 && error.status !== 404)) throw error
      tierReason = error.isScope
        ? 'FIGMA_TOKEN lacks the file_variables:read scope — regenerate it with Variables: Read'
        : `/variables/local denied (${error.status}) — the file's plan has no variables REST access`
      if (tier === 'enterprise') throw new Error(`--tier enterprise: ${tierReason}`)
    }
  }
  log(`professional tier: ${tierReason}. Variables from the relay…`)
  try {
    return { tier: 'professional', tierReason, tokens: await fallbacks.relay(), names: new Map() }
  } catch {
    const committed = fallbacks.committed()
    if (!committed) throw new Error('No variables: REST denied, relay unreachable and figma/tokens.json is missing')
    log('relay unreachable — variable VALUES are NOT refreshed this run; bindings are named from the ids in figma/tokens.json')
    return { tier: 'professional', tierReason, tokens: committed, names: namesFromTokens(committed), tokensStale: true }
  }
}

function indexTree(root: RestNode, into: Map<string, RestNode>): void {
  into.set(root.id, root)
  for (const c of root.children ?? []) indexTree(c, into)
}

export async function pullRest(manifest: RestManifest, options: RestPullOptions, fallbacks: TokenFallbacks, log: (m: string) => void = console.warn): Promise<RestPullResult> {
  const source = await resolveTokens(manifest, options, fallbacks, log)
  // The relay extractor names bindings itself; for REST the live index wins, then recorded ids.
  const names = source.index ? new Map(Object.values(source.index.byId).map((v) => [v.id, v.name])) : source.names.size ? source.names : namesFromTokens(source.tokens)
  const unknown = new Set<string>()
  const nameOf = (b: RestAlias | RestAlias[] | undefined) => {
    const f = Array.isArray(b) ? b[0] : b
    if (!f) return undefined
    const n = names.get(f.id)
    if (n) return n
    unknown.add(f.id)
    return `lib:${f.id}`
  }

  // 1. The whole Components page: coverage, discovery, and most sets in one call.
  const pageRes = await figmaGet<RestNodesResponse>(withVersion(`/files/${manifest.fileKey}/nodes?ids=${encodeURIComponent(manifest.componentsPage.id)}`, options.version))
  const page = pageRes.nodes[manifest.componentsPage.id]?.document
  if (!page) throw new Error(`Components page ${manifest.componentsPage.id} (${manifest.componentsPage.name}) not found`)
  const byId = new Map<string, RestNode>()
  indexTree(page, byId)

  // 2. Whatever the manifest maps outside that page (screens, legacy sets) plus the icon set.
  const elsewhere = [...manifest.componentSets.map((s) => s.id), manifest.iconSet.id].filter((id) => !byId.has(id))
  const responses: RestNodesResponse[] = [pageRes]
  if (elsewhere.length) {
    const extra = await figmaGet<RestNodesResponse>(withVersion(`/files/${manifest.fileKey}/nodes?ids=${encodeURIComponent(elsewhere.join(','))}`, options.version))
    responses.push(extra)
    for (const e of Object.values(extra.nodes)) if (e) indexTree(e.document, byId)
  }
  const tables = responses.map(tablesOf).reduce((a, b) => ({
    components: new Map([...a.components, ...b.components]),
    componentSets: new Map([...a.componentSets, ...b.componentSets]),
    styles: new Map([...a.styles, ...b.styles]),
  }))
  const ctx: DescribeContext = { nameOf, ...tables }

  // 3. Manifest vs file: follow sets that moved, report the rest.
  const reconciliation = reconcile(manifest.componentSets, new Set(byId.keys()), discoverSets(page), [manifest.iconSet.id, ...(manifest.logoSet ? [manifest.logoSet.id] : [])])
  const movedTo = new Map(reconciliation.moved.map((m) => [m.code, m.to]))
  if (reconciliation.missing.length) {
    throw new Error(`Manifest sets not found in the file: ${reconciliation.missing.map((m) => `${m.code} (${m.figma}, ${m.id})`).join('; ')}. Fix figma/manifest.json or remove them.`)
  }

  const sets = manifest.componentSets.map((set) => {
    const doc = byId.get(movedTo.get(set.code) ?? set.id)
    if (!doc) throw new Error(`${set.code}: node ${set.id} (${set.figma}) not returned by the API`)
    return describeSet(ctx, set.code, doc)
  })
  const version = pageRes.version ?? options.version
  const components: ComponentsSnapshot = {
    fileKey: manifest.fileKey, page: manifest.componentsPage, pulledAt: source.tokens.pulledAt,
    ...(version ? { version } : {}), sets, coverage: coverageRows(page),
  }
  const icons = await restIcons(manifest.fileKey, manifest.iconSet, byId.get(manifest.iconSet.id), options.version)
  const tokens = source.tokensStale || !version ? source.tokens : { ...source.tokens, version }

  return {
    tier: source.tier, ...(source.tierReason ? { tierReason: source.tierReason } : {}),
    tokens, components, icons, reconciliation,
    ...(source.tokensStale ? { tokensStale: true } : {}),
    ...(names.size === 0 ? { bindingsUnnamed: true } : {}),
    unknownVariableIds: [...unknown],
  }
}
