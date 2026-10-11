// Settings › Dual File Mode → which files to read, with which token, for what;
// then the REST reads per file, merged into one LibraryIndex. A file that
// fails keeps its slot with the reason, so the other file still answers.
import * as z from 'zod/mini'
import {
  normalizeIntegration, sectionSchemas, validateIntegration,
  type ConnectionTestResult, type IntegrationValues,
} from '@shared/integrations'
import { createFigmaGet, LibraryError, type HttpFetch } from './rest'
import {
  toComponents, toVariables,
  type RestComponentSetsResponse, type RestComponentsResponse, type RestVariablesResponse,
} from './normalize'
import type { LibraryFile, LibraryIndex, LibraryLoadResult, LibraryRole } from './types'

type DualFile = IntegrationValues<'dualFile'>

export interface FileSpec { slot: 1 | 2; fileKey: string; token: string; roles: readonly LibraryRole[] }

/** "Variables + Components" → both; an unknown value reads as both rather than dropping the file. */
export function rolesOf(role: string): LibraryRole[] {
  if (role === 'Variables') return ['variables']
  if (role === 'Components') return ['components']
  return ['variables', 'components']
}

/** The files Settings describe. File 2 borrows File 1's token when its own is empty. */
export function filesFromSettings(s: DualFile): FileSpec[] {
  const specs: FileSpec[] = []
  if (s.file1Id.trim()) specs.push({ slot: 1, fileKey: s.file1Id.trim(), token: s.file1Key.trim(), roles: rolesOf(s.file1Role) })
  if (s.file2Id.trim()) specs.push({ slot: 2, fileKey: s.file2Id.trim(), token: (s.file2Key.trim() || s.file1Key.trim()), roles: rolesOf(s.file2Role) })
  return specs
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

const EMPTY = { variables: [], components: [], collections: [] } as const

/** Reads one file for its roles. Errors become the file's `error`; nothing is thrown. */
export async function readFile(spec: FileSpec, fetchImpl: HttpFetch): Promise<FileRead> {
  const label = `File ${spec.slot}`
  const get = createFigmaGet(spec.token, label, fetchImpl)
  const base: LibraryFile = { slot: spec.slot, fileKey: spec.fileKey, name: spec.fileKey, roles: spec.roles, variables: 0, components: 0, collections: [] }
  const path = `/files/${encodeURIComponent(spec.fileKey)}`
  // The name is a nicety: a token without file_metadata:read still loads the library.
  const name = get<{ file?: { name?: string } }>(`${path}/meta`, 'meta').then((r) => r.file?.name ?? '', () => '')
  try {
    const [vars, comps] = await Promise.all([
      spec.roles.includes('variables') ? get<RestVariablesResponse>(`${path}/variables/local`, 'variables').then((r) => toVariables(r, spec.fileKey)) : null,
      spec.roles.includes('components')
        ? Promise.all([
          get<RestComponentsResponse>(`${path}/components`, 'components'),
          get<RestComponentSetsResponse>(`${path}/component_sets`, 'components'),
        ]).then(([c, s]) => toComponents(c, s, spec.fileKey))
        : null,
    ])
    const variables = vars?.variables ?? []
    const components = comps ?? []
    const warning = comps !== null && components.length === 0
      ? 'No published components. Publish the library (Assets › Libraries) so other files can use it.'
      : vars !== null && variables.length === 0 ? 'No local variables in this file.' : undefined
    return {
      file: {
        ...base, name: (await name) || spec.fileKey, variables: variables.length, components: components.length,
        collections: (vars?.collections ?? []).map((c) => c.name), ...(warning ? { warning } : {}),
      },
      index: { variables, components, collections: vars?.collections ?? [] },
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
    loadedAt: now(),
  }
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One line per file for the Test Connection notice. */
export function describeFile(f: LibraryFile): string {
  const parts = [
    ...(f.roles.includes('variables') ? [`${count(f.variables, 'variable')}${f.collections.length ? ` in ${count(f.collections.length, 'collection')}` : ''}`] : []),
    ...(f.roles.includes('components') ? [count(f.components, 'published component')] : []),
  ]
  return `File ${f.slot} “${f.name}”: ${parts.join(', ')}.${f.warning ? ` ${f.warning}` : ''}`
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
