// Test helper: Dual File settings from a short list of files. Not imported by app code.
import { DEFAULT_INTEGRATIONS, defaultFileName, type IntegrationValues, type LibraryFileEntry } from './schema'

/** A file as an ID ('LIB') or a partial row; missing names become "File n", missing roles "Variables + Components". */
export type FileInput = string | Partial<LibraryFileEntry>

export function dualFileWith(files: readonly FileInput[], token = '', extra: Partial<IntegrationValues<'dualFile'>> = {}): IntegrationValues<'dualFile'> {
  return {
    ...DEFAULT_INTEGRATIONS.dualFile,
    token,
    files: files.map((f, i) => {
      const row = typeof f === 'string' ? { id: f } : f
      return { name: row.name ?? defaultFileName(i), id: row.id ?? '', role: row.role ?? 'Variables + Components' }
    }),
    ...extra,
  }
}
