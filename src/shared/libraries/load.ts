// Settings › Dual File Mode → which files to read, with which token, for what;
// then the REST reads per file, merged into one LibraryIndex. A file that
// fails keeps its slot with the reason, so the other file still answers.
import * as z from 'zod/mini'
import {
  defaultFileName, normalizeIntegration, sectionSchemas, validateIntegration,
  type ConnectionTestResult, type IntegrationValues,
} from '@shared/integrations'
import { createFigmaGet, LibraryError, type HttpFetch } from './rest'
import {
  toComponents, toStyles, toVariables,
  type RestComponentSetsResponse, type RestComponentsResponse, type RestNodesResponse, type RestStylesResponse, type RestVariablesResponse,
} from './normalize'
import { fileLabel, type LibraryFile, type LibraryIndex, type LibraryLoadResult, type LibraryRole, type LibraryStyle } from './types'

type DualFile = IntegrationValues<'dualFile'>

export interface FileSpec {
  slot: number
  fileKey: string
  token: string
  roles: readonly LibraryRole[]
  /** The name the person gave the file in Settings ("Core variables", "File 2"). */
  label?: string
}

/** "Variables + Components" → both; an unknown value reads as both rather than dropping the file. */
export function rolesOf(role: string): LibraryRole[] {
  if (role === 'Variables') return ['variables']
  if (role === 'Components') return ['components']
  return ['variables', 'components']
}

/** The files Settings describe, in their order, each read with the one token. Rows without an ID are skipped. */
export function filesFromSettings(s: DualFile): FileSpec[] {
  const token = s.token.trim()
  return (s.files ?? []).flatMap((f, i): FileSpec[] => f.id.trim()
    ? [{ slot: i + 1, fileKey: f.id.trim(), token, roles: rolesOf(f.role), label: f.name.trim() || defaultFileName(i) }]
    : [])
}

/** Why there is nothing to load, or null when there is. Stored values are re-checked before any token is sent. */
export function settingsProblem(s: DualFile): Extract<LibraryLoadResult, { status: 'not-configured' }> | null {
  if (!s.enabled) return { status: 'not-configured', reason: 'disabled', message: 'Dual File Mode is off. Turn it on in Settings › Dual File Mode.' }
  const first = Object.values(validateIntegration('dualFile', s))[0]
  if (first) return { status: 'not-configured', reason: 'empty', message: `Fix Settings › Dual File Mode: ${first}` }
  if (!filesFromSettings(s).length) return { status: 'not-configured', reason: 'empty', message: 'Add your library files in Settings › Dual File Mode.' }
  return null
}

interface FileRead { file: LibraryFile; index: Omit<LibraryIndex, 'files' | 'loadedAt'> }

const EMPTY = { variables: [], components: [], collections: [], styles: [] } as const

/** `/nodes` takes a comma-separated id list; keep each request short of the URL limit. */
const NODES_PER_REQUEST = 60

/**
 * Published text and colour styles: the list, then the style nodes the values live on. A key
 * that can't list styles (scope, plan) just reads no styles; it never fails the file.
 */
export async function readStyles(get: ReturnType<typeof createFigmaGet>, path: string, fileKey: string): Promise<LibraryStyle[]> {
  let listed: RestStylesResponse
  try {
    listed = await get<RestStylesResponse>(`${path}/styles`, 'styles')
  } catch {
    return []
  }
  const ids = listed.meta.styles.filter((s) => s.style_type === 'TEXT' || s.style_type === 'FILL').map((s) => s.node_id)
  const nodes: RestNodesResponse = { nodes: {} }
  for (let i = 0; i < ids.length; i += NODES_PER_REQUEST) {
    try {
      const chunk = await get<RestNodesResponse>(`${path}/nodes?ids=${encodeURIComponent(ids.slice(i, i + NODES_PER_REQUEST).join(','))}`, 'nodes')
      Object.assign(nodes.nodes, chunk.nodes)
    } catch {
      // Names without values still answer "which styles exist".
    }
  }
  return toStyles(listed, nodes, fileKey)
}

/** Reads one file for its roles. Errors become the file's `error`; nothing is thrown. */
export async function readFile(spec: FileSpec, fetchImpl: HttpFetch): Promise<FileRead> {
  const label = fileLabel(spec)
  const get = createFigmaGet(spec.token, label, fetchImpl)
  const base: LibraryFile = { slot: spec.slot, fileKey: spec.fileKey, name: spec.fileKey, ...(spec.label ? { label: spec.label } : {}), roles: spec.roles, variables: 0, components: 0, collections: [] }
  const path = `/files/${encodeURIComponent(spec.fileKey)}`
  // The name is a nicety: a token without file_metadata:read still loads the library.
  const name = get<{ file?: { name?: string } }>(`${path}/meta`, 'meta').then((r) => r.file?.name ?? '', () => '')
  try {
    const [vars, comps, styles] = await Promise.all([
      spec.roles.includes('variables') ? get<RestVariablesResponse>(`${path}/variables/local`, 'variables').then((r) => toVariables(r, spec.fileKey)) : null,
      spec.roles.includes('components')
        ? Promise.all([
          get<RestComponentsResponse>(`${path}/components`, 'components'),
          get<RestComponentSetsResponse>(`${path}/component_sets`, 'components'),
        ]).then(([c, s]) => toComponents(c, s, spec.fileKey))
        : null,
      // Styles come with every role: a Variables file often carries the type ramp as text styles too.
      readStyles(get, path, spec.fileKey),
    ])
    const variables = vars?.variables ?? []
    const components = comps ?? []
    const warning = comps !== null && components.length === 0
      ? 'No published components. Publish the library (Assets › Libraries) so other files can use it.'
      : vars !== null && variables.length === 0 ? 'No local variables in this file.' : undefined
    return {
      file: {
        ...base, name: (await name) || spec.fileKey, variables: variables.length, components: components.length, styles: styles.length,
        collections: (vars?.collections ?? []).map((c) => c.name), ...(warning ? { warning } : {}),
      },
      index: { variables, components, collections: vars?.collections ?? [], styles },
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : `${label} couldn’t be read.`
    return { file: { ...base, name: (await name) || spec.fileKey, error: message }, index: EMPTY }
  }
}

/** Every configured file, read in parallel and merged. */
export async function loadLibraries(specs: readonly FileSpec[], fetchImpl: HttpFetch, now: () => number = Date.now): Promise<LibraryIndex> {
  const reads = await Promise.all(specs.map((spec) => readFile(spec, fetchImpl)))
  return {
    files: reads.map((r) => r.file),
    variables: reads.flatMap((r) => r.index.variables),
    components: reads.flatMap((r) => r.index.components),
    collections: reads.flatMap((r) => r.index.collections),
    styles: reads.flatMap((r) => r.index.styles ?? []),
    loadedAt: now(),
  }
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One line per file for the Test Connection notice. */
export function describeFile(f: LibraryFile): string {
  const parts = [
    ...(f.roles.includes('variables') ? [`${count(f.variables, 'variable')}${f.collections.length ? ` in ${count(f.collections.length, 'collection')}` : ''}`] : []),
    ...(f.roles.includes('components') ? [count(f.components, 'published component')] : []),
    ...(f.styles ? [count(f.styles, 'published style')] : []),
  ]
  return `${fileLabel(f)} “${f.name}”: ${parts.join(', ')}.${f.warning ? ` ${f.warning}` : ''}`
}

/** Settings › Test Connection: the form's unsaved values, read for real (even while the switch is off). */
export async function testDualFile(payload: unknown, fetchImpl: HttpFetch): Promise<ConnectionTestResult> {
  const parsed = z.safeParse(sectionSchemas.dualFile, payload)
  if (!parsed.success) throw new LibraryError('Those Dual File settings are incomplete or too long.', 0)
  const values = { ...normalizeIntegration<'dualFile'>(parsed.data, 'dualFile'), enabled: true }
  const problem = settingsProblem(values)
  if (problem) throw new LibraryError(problem.message, 0)
  const index = await loadLibraries(filesFromSettings(values), fetchImpl)
  const failed = index.files.find((f) => f.error)
  if (failed) throw new LibraryError(failed.error!, 0)
  return { message: index.files.map(describeFile).join(' ') }
}
