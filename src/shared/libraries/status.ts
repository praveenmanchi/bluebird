// UI side of Dual File Mode: one shared load state, so the footer's Dual File
// pill and the UXAI tab always agree on whether the libraries are connected.
import { signal } from '@preact/signals'
import type { RpcClient } from '@shared/bridge'
import type { StatusPillStatus } from '@shared/ui'
import { LIBRARIES_MSG, type LibraryLoadResult } from './types'

/** Where the libraries are: still loading, the sandbox's answer, or why asking failed. */
export type LibraryState = { status: 'loading' } | { status: 'error'; message: string } | LibraryLoadResult

/** Reading a large variables file over REST takes ~20 s; give it room. */
export const LOAD_TIMEOUT_MS = 90_000

export const libraryState = signal<LibraryState>({ status: 'loading' })

/** Bumped per load, so an answer from an older load (an earlier Refresh, a previous mount) is ignored. */
let seq = 0
let started = false

/** Loads the libraries (from the sandbox's cache unless `refresh`) and publishes the result. */
export async function loadLibraryState(client: RpcClient, refresh = false): Promise<LibraryState> {
  started = true
  const mine = ++seq
  libraryState.value = { status: 'loading' }
  let next: LibraryState
  try {
    next = await client.call<LibraryLoadResult>(LIBRARIES_MSG.load, refresh ? { refresh: true } : undefined, LOAD_TIMEOUT_MS)
  } catch (error: unknown) {
    next = { status: 'error', message: error instanceof Error ? error.message : 'Try again in a moment.' }
  }
  if (mine === seq) libraryState.value = next
  return libraryState.value
}

/** The first load of a plugin session; later callers reuse it. */
export function ensureLibraryState(client: RpcClient): void {
  if (!started) void loadLibraryState(client)
}

export interface LibraryPill { status: StatusPillStatus; label: string; title: string }

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

/** The footer's Dual File pill: connected, partly connected, failed, off, not set up, or connecting. */
export function libraryPill(state: LibraryState): LibraryPill {
  switch (state.status) {
    case 'loading':
      return { status: 'retry', label: 'Dual File · connecting…', title: 'Reading your Dual File libraries from Figma…' }
    case 'error':
      return { status: 'error', label: 'Dual File · failed', title: state.message }
    case 'not-configured':
      return { status: 'issue', label: state.reason === 'disabled' ? 'Dual File · off' : 'Dual File', title: state.message }
  }
  const { files } = state.index
  const ok = files.filter((f) => !f.error)
  const detail = files.map((f) => f.error
    ? `File ${f.slot} ${f.name}: ${f.error}`
    : `File ${f.slot} ${f.name}: ${[f.roles.includes('variables') ? plural(f.variables, 'variable') : '', f.roles.includes('components') ? plural(f.components, 'component') : ''].filter(Boolean).join(', ')}`).join('\n')
  if (!ok.length) return { status: 'error', label: 'Dual File · failed', title: detail }
  if (ok.length < files.length) return { status: 'issue', label: `Dual File · ${ok.length} of ${files.length} files`, title: detail }
  return { status: 'good', label: 'Dual File · connected', title: detail }
}
