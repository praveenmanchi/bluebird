// Variables over REST. GET /v1/files/:key/variables/local is Enterprise-only: it returns every local
// variable plus the library variables this file subscribes to, with their full metadata.
import type { ExtractManifest } from '../../src/shared/brand/extract'
import type { ResolvedValue, TokenSnapshot } from '../../src/shared/brand/snapshot'
import { variableMeta } from '../../src/shared/brand/snapshot'
import { figmaGet } from './http'
import { restColorToHex } from './normalize'
import type { RestCollection, RestVariable } from './types'

export interface VariableIndex { byId: Record<string, RestVariable>; collections: RestCollection[] }

const MAX_ALIAS_DEPTH = 10

export async function fetchVariableIndex(fileKey: string): Promise<VariableIndex> {
  const res = await figmaGet<{ meta: { variables: Record<string, RestVariable>; variableCollections: Record<string, RestCollection> } }>(`/files/${fileKey}/variables/local`)
  return { byId: res.meta.variables, collections: Object.values(res.meta.variableCollections) }
}

const isAlias = (v: unknown): v is { type: 'VARIABLE_ALIAS'; id: string } =>
  typeof v === 'object' && v !== null && (v as { type?: string }).type === 'VARIABLE_ALIAS'

/** Build the token snapshot. Mirrors extract.ts: an alias hop into another collection uses that
 *  collection's mode of the same name, falling back to its default mode. */
export function restTokens(manifest: ExtractManifest, index: VariableIndex, version?: string): TokenSnapshot {
  const { byId, collections } = index
  const collectionsById = Object.fromEntries(collections.map((c) => [c.id, c]))
  const resolve = (value: unknown, mode: { modeId: string; name: string }, depth = 0): ResolvedValue => {
    if (value === undefined || depth > MAX_ALIAS_DEPTH) return null
    if (isAlias(value)) {
      const target = byId[value.id]
      if (!target) return null
      const collection = collectionsById[target.variableCollectionId]
      const modeId = collection?.modes.find((m) => m.name === mode.name)?.modeId ?? collection?.defaultModeId ?? mode.modeId
      return resolve(target.valuesByMode[modeId] ?? Object.values(target.valuesByMode)[0], { modeId, name: mode.name }, depth + 1)
    }
    if (typeof value === 'object' && value !== null && 'r' in value) return restColorToHex(value as { r: number; g: number; b: number; a?: number })
    return value as string | number | boolean
  }
  return {
    fileKey: manifest.fileKey, fileName: '', pulledAt: new Date().toISOString().slice(0, 10), source: 'figma-rest',
    ...(version ? { version } : {}),
    collections: Object.entries(manifest.collections).map(([key, name]) => {
      // Subscribed libraries bring their own collections, often with the same names ("Colors",
      // "Sizing"). The manifest always means this file's own collection.
      const c = collections.find((col) => col.name === name && !col.remote) ?? collections.find((col) => col.name === name)
      if (!c) throw new Error(`Collection "${name}" not found`)
      return {
        id: c.id, ...(c.key ? { publishKey: c.key } : {}),
        name: c.name, key, modes: c.modes.map((m) => m.name),
        defaultMode: c.modes.find((m) => m.modeId === c.defaultModeId)?.name ?? '',
        variables: c.variableIds.map((id) => byId[id]).filter((v): v is RestVariable => !!v).map((v) => {
          const values: Record<string, ResolvedValue> = {}
          const aliases: Record<string, string> = {}
          for (const m of c.modes) {
            const raw = v.valuesByMode[m.modeId]
            values[m.name] = resolve(raw, m)
            if (isAlias(raw)) {
              const t = byId[raw.id]
              if (t) aliases[m.name] = `${collectionsById[t.variableCollectionId]?.name}/${t.name}`
            }
          }
          // The id is what lets a later Professional-tier pull name bindings without /variables/local.
          return { id: v.id, name: v.name, type: v.resolvedType, values, ...(Object.keys(aliases).length ? { aliases } : {}), ...variableMeta(v) }
        }),
      }
    }),
  }
}

/** id → name from a committed snapshot, for Professional-tier pulls. Variable ids are stable for the
 *  life of the file, so one Enterprise or relay pull seeds a map every later REST pull can reuse. */
export function namesFromTokens(tokens: TokenSnapshot | undefined): Map<string, string> {
  const out = new Map<string, string>()
  for (const c of tokens?.collections ?? []) for (const v of c.variables) if (v.id) out.set(v.id, v.name)
  return out
}
