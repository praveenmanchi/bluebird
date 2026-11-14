// Versioning: the open file's Figma version history over the REST API (the key
// from Settings › Dual File Mode), and what changed in one version compared
// with the version before it. Built from injected dependencies like the rest.
import type { HandlerMap } from '@shared/bridge'
import type { IntegrationValues } from '@shared/integrations'
import { createFigmaGet, type FigmaGet, type HttpFetch } from '@shared/libraries/rest'
import { MSG, versionDiffRequestSchema, versionsRequestSchema, type VersionDiff, type VersionsResult } from '../messages'
import { diffStructure, toVersions, type RestFile, type RestVersion } from '../versions'

export interface VersionsDeps {
  readDualFile(): Promise<IntegrationValues<'dualFile'>>
  fetch: HttpFetch
  sleep(ms: number): Promise<void>
  now(): Date
  /** figma.fileKey; null where Figma doesn't give the plugin the key. */
  fileKey(): string | null
  fileName(): string
}

export const NO_FILE_KEY = 'Figma didn’t give the plugin this file’s key, so its versions can’t be read. Run the plugin from your organisation’s plugins (or as a development plugin).'
export const NO_REST_KEY = 'Add a Figma API key in Settings › Dual File Mode. Versioning reads this file’s version history with it.'

/** Versions Figma returns per page; one page covers weeks of work. */
const PAGE_SIZE = 50
/** Pages, the layers on them and the components map: enough to say what a version changed. */
const STRUCTURE_DEPTH = 2

export function createVersionsHandlers(deps: VersionsDeps): HandlerMap {
  async function connect(): Promise<{ get: FigmaGet; key: string } | { problem: string }> {
    const key = deps.fileKey()
    if (!key) return { problem: NO_FILE_KEY }
    const token = (await deps.readDualFile()).token.trim()
    if (!token) return { problem: NO_REST_KEY }
    return { get: createFigmaGet(token, 'This file', deps.fetch, deps.sleep), key }
  }

  async function versions(payload: unknown): Promise<VersionsResult> {
    const { days } = versionsRequestSchema.parse(payload)
    const file = deps.fileName()
    const conn = await connect()
    if ('problem' in conn) return { file, versions: [], problem: conn.problem, needsSettings: true }
    const res = await conn.get<{ versions?: RestVersion[] }>(`/files/${encodeURIComponent(conn.key)}/versions?page_size=${PAGE_SIZE}`, 'versions')
    const since = new Date(deps.now().getTime() - days * 86_400_000).toISOString()
    return { file, versions: toVersions(res.versions ?? [], since) }
  }

  async function diff(payload: unknown): Promise<VersionDiff> {
    const req = versionDiffRequestSchema.parse(payload)
    const conn = await connect()
    if ('problem' in conn) throw new Error(conn.problem)
    const at = (id: string) => conn.get<RestFile>(`/files/${encodeURIComponent(conn.key)}?version=${id}&depth=${STRUCTURE_DEPTH}`, 'nodes')
    const [after, before] = await Promise.all([at(req.id), req.previousId ? at(req.previousId) : Promise.resolve(null)])
    return diffStructure(before, after)
  }

  return {
    [MSG.versions]: async (payload: unknown) => versions(payload),
    [MSG.versionDiff]: async (payload: unknown) => diff(payload),
  }
}
