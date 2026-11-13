// Choose → review → apply, shared by Settings › Team setup file and the onboarding import step.
import { useCallback, useState } from 'preact/hooks'
import type { IntegrationSettings, ParsedSettingsFile } from '@shared/integrations'
import { readSettingsFile, summarizeImport, type ImportSummary } from './settingsFileView'

export type ImportState =
  | { kind: 'idle' }
  | { kind: 'review'; name: string; file: ParsedSettingsFile; raw: unknown; applying: boolean; error: string | null }
  | { kind: 'applied'; name: string; summary: ImportSummary }
  | { kind: 'invalid'; name: string; message: string }

export interface SettingsImport {
  state: ImportState
  /** Reads a picked or dropped file and moves to review, or to invalid with the reason. */
  choose: (file: Pick<File, 'name' | 'size' | 'text'>) => Promise<void>
  /** Sends the reviewed file to the store. Resolves to the new settings, or null when it failed. */
  apply: (keepExisting: boolean) => Promise<IntegrationSettings | null>
  reset: () => void
}

export type ImportFile = (file: unknown, keepExisting: boolean) => Promise<IntegrationSettings>

export function useSettingsImport(importFile: ImportFile | undefined): SettingsImport {
  const [state, setState] = useState<ImportState>({ kind: 'idle' })

  const choose = useCallback(async (picked: Pick<File, 'name' | 'size' | 'text'>) => {
    const chosen = await readSettingsFile(picked)
    setState(chosen.result.ok
      ? { kind: 'review', name: chosen.name, file: chosen.result.file, raw: chosen.raw, applying: false, error: null }
      : { kind: 'invalid', name: chosen.name, message: chosen.result.message })
  }, [])

  const apply = useCallback(async (keepExisting: boolean): Promise<IntegrationSettings | null> => {
    if (state.kind !== 'review' || state.applying || !importFile) return null
    setState({ ...state, applying: true, error: null })
    try {
      const settings = await importFile(state.raw, keepExisting)
      // Every section now holds what the file asked for, so the summary no longer depends on keepExisting.
      setState({ kind: 'applied', name: state.name, summary: summarizeImport(state.file, settings, true) })
      return settings
    } catch (error: unknown) {
      setState({ ...state, applying: false, error: error instanceof Error ? error.message : 'The settings couldn’t be saved.' })
      return null
    }
  }, [state, importFile])

  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, choose, apply, reset }
}
