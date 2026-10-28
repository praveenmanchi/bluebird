// Variables over REST. GET /v1/files/:key/variables/local is Enterprise-only: it returns every local
// variable plus the library variables this file subscribes to, with their full metadata.
import type { ExtractManifest } from '../../src/shared/brand/extract'
import type { ResolvedValue, TokenSnapshot } from '../../src/shared/brand/snapshot'
import { variableMeta } from '../../src/shared/brand/snapshot'
import { composeColor, isAlias, isComposedColor, isRgba, MAX_VALUE_DEPTH, rawModeValue } from '../../src/shared/figma/variableValues'
import { figmaGet } from './http'
import { restColorToHex } from './normalize'
import type { RestCollection, RestVariable } from './types'

export interface VariableIndex { byId: Record<string, RestVariable>; collections: RestCollection[] }

export async function fetchVariableIndex(fileKey: string): Promise<VariableIndex> {
  const res = await figmaGet<{ meta: { variables: Record<string, RestVariable>; variableCollections: Record<string, RestCollection> } }>(`/files/${fileKey}/variables/local`)
  return { byId: res.meta.variables, collections: Object.values(res.meta.variableCollections) }
}

/**
 * Build the token snapshot. Mirrors extract.ts: an alias hop into another collection uses that
 * collection's mode of the same name, falling back to its default mode. Extended collections answer
 * from their overrides, then the parent's mode; composed colours flatten to one RGBA.
 *
 * Not stamped with a file version: /variables/local takes no `version` parameter, so the values are
 * always the file's latest even when the nodes were read at `--version`.
 */
export function restTokens(manifest: ExtractManifest, index: VariableIndex): TokenSnapshot {
  const { byId, collections } = index
  const collectionsById: Record<string, RestCollection | undefined> = Object.fromEntries(collections.map((c) => [c.id, c]))
  const resolveRaw = (value: unknown, mode: { modeId: string; name: string }, depth = 0): unknown => {
    if (value === undefined || depth > MAX_VALUE_DEPTH) return undefined
    if (isAlias(value)) {
      const target = byId[value.id]
      if (!target) return undefined
      const collection = collectionsById[target.variableCollectionId]
      const modeId = collection?.modes.find((m) => m.name === mode.name)?.modeId ?? collection?.defaultModeId ?? mode.modeId
      const raw = rawModeValue(target, collection, modeId, collectionsById) ?? Object.values(target.valuesByMode)[0]
      return resolveRaw(raw, { modeId, name: mode.name }, depth + 1)
    }
    if (isComposedColor(value)) {
      return composeColor(resolveRaw(value.color, mode, depth + 1), resolveRaw(value.opacity, mode, depth + 1))
    }
    return value
  }
  const resolve = (value: unknown, mode: { modeId: string; name: string }): ResolvedValue => {
    const raw = resolveRaw(value, mode)
    if (raw === undefined || raw === null) return null
    if (isRgba(raw)) return restColorToHex(raw)
    return typeof raw === 'object' ? null : raw as string | number | boolean
  }
  return {
    fileKey: manifest.fileKey, fileName: '', pulledAt: new Date().toISOString().slice(0, 10), source: 'figma-rest',
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
            const raw = rawModeValue(v, c, m.modeId, collectionsById)
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
