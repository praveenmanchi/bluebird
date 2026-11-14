import { Button, Input } from '@shared/ui'
import { FILE_ROLES, MAX_FILE_NAME, MAX_LIBRARY_FILES, MAX_TEXT, defaultFileName, newLibraryFile, type FieldErrors, type LibraryFileEntry } from '@shared/integrations'
import { SelectInput } from './SelectInput'

export interface LibraryFilesListProps {
  label: string
  files: readonly LibraryFileEntry[]
  /** Section errors; this list's rows are keyed files.<i>.<field>. */
  errors: FieldErrors
  disabled?: boolean
  onChange: (files: readonly LibraryFileEntry[]) => void
}

const addHint = (count: number): string => {
  const left = MAX_LIBRARY_FILES - count
  if (left <= 0) return `${MAX_LIBRARY_FILES} files is the most Dual File reads. Remove one to add another.`
  return `You can add ${left} more ${left === 1 ? 'file' : 'files'}, for example a separate icon library.`
}

/**
 * Dual File Mode's library files (Figma "Settings · 600 · Integrations open", screens 1–4): one card
 * per file with its name, what it contains and its Figma URL. Add file appends "File n" up to
 * MAX_LIBRARY_FILES; every file after the first can be removed. The one token sits above the list.
 */
export function LibraryFilesList({ label, files, errors, disabled = false, onChange }: LibraryFilesListProps) {
  const rows = files.length ? files : [newLibraryFile(0)]
  const update = (i: number, patch: Partial<LibraryFileEntry>) => onChange(rows.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))
  const error = (i: number, field: keyof LibraryFileEntry) => errors[`files.${i}.${field}`]
  const full = rows.length >= MAX_LIBRARY_FILES
  return (
    <div class="bb-integrations__files" role="group" aria-label={label}>
      <div class="bb-integrations__files-label">
        <span class="bb-integrations__files-title">{label}</span>
        <span class="bb-integrations__files-count">{`${rows.length} of ${MAX_LIBRARY_FILES}`}</span>
      </div>
      {rows.map((f, i) => {
        const name = f.name.trim() || defaultFileName(i)
        return (
          <div key={i} class="bb-integrations__file" role="group" aria-label={name}>
            <div class="bb-integrations__file-head">
              <Input class="bb-integrations__file-name" label="File name" icon="file" value={f.name} placeholder={defaultFileName(i)}
                helperText={error(i, 'name')} error={error(i, 'name') !== undefined} disabled={disabled} maxLength={MAX_FILE_NAME}
                spellcheck={false} autoComplete="off" onValueChange={(v) => update(i, { name: v })} />
              {i > 0 && (
                <Button variant="secondary" leadingIcon="ui-general-trash" disabled={disabled} aria-label={`Remove ${name}`} onClick={() => remove(i)}>Remove</Button>
              )}
            </div>
            <div class="bb-integrations__file-body">
              <div class="bb-integrations__file-role">
                <SelectInput label="Contains" icon="layers" value={f.role} options={FILE_ROLES} disabled={disabled} onChange={(v) => update(i, { role: v })} />
              </div>
              <Input class="bb-integrations__file-url" label="Figma file URL" icon="url" value={f.id} placeholder="Paste a figma.com/design/… link"
                helperText={error(i, 'id')} error={error(i, 'id') !== undefined} disabled={disabled} maxLength={MAX_TEXT}
                spellcheck={false} autoComplete="off" onValueChange={(v) => update(i, { id: v })} />
            </div>
          </div>
        )
      })}
      {errors.files && <p class="bb-integrations__files-hint" role="alert">{errors.files}</p>}
      <div class="bb-integrations__files-add">
        <Button variant="secondary" leadingIcon="ui-general-add" disabled={disabled || full} onClick={() => onChange([...rows, newLibraryFile(rows.length)])}>Add file</Button>
        <span class="bb-integrations__files-hint">{addHint(rows.length)}</span>
      </div>
    </div>
  )
}
