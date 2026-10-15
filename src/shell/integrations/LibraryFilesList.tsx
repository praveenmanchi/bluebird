import { Button, Input, LinkButton } from '@shared/ui'
import { FILE_ROLES, MAX_EXTRA_FILES, MAX_TEXT, type FieldErrors, type LibraryFileEntry } from '@shared/integrations'
import { SelectInput } from './SelectInput'

export interface LibraryFilesListProps {
  label: string
  files: readonly LibraryFileEntry[]
  /** Section errors; this list's rows are keyed extraFiles.<i>.<field>. */
  errors: FieldErrors
  disabled?: boolean
  onChange: (files: readonly LibraryFileEntry[]) => void
}

const EMPTY_ROW: LibraryFileEntry = { id: '', key: '', role: 'Components' }

/**
 * Files 3…N of Dual File Mode. Not drawn in Figma (the frame has two slots): each row repeats
 * the slot layout — ID, what it contains, API key — plus Remove, with "Add another library file"
 * below. Every row borrows File 1's key when its own is empty, like File 2 does.
 */
export function LibraryFilesList({ label, files, errors, disabled = false, onChange }: LibraryFilesListProps) {
  const update = (i: number, patch: Partial<LibraryFileEntry>) => onChange(files.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const remove = (i: number) => onChange(files.filter((_, j) => j !== i))
  const error = (i: number, field: keyof LibraryFileEntry) => errors[`extraFiles.${i}.${field}`]
  return (
    <div class="bb-integrations__files" role="group" aria-label={label}>
      {files.map((f, i) => {
        const n = i + 3
        return (
          <div key={i} class="bb-integrations__files-row" data-columns="narrow-wide">
            <div class="bb-integrations__row">
              <div class="bb-integrations__column">
                <Input label={`File ${n} ID`} icon="layers" value={f.id} placeholder="File URL or ID from figma.com/design/…" helperText={error(i, 'id')} error={error(i, 'id') !== undefined} disabled={disabled} maxLength={MAX_TEXT} spellcheck={false} autoComplete="off" onValueChange={(v) => update(i, { id: v })} />
                <SelectInput label={`File ${n} contains`} icon="layers" value={f.role} options={FILE_ROLES} disabled={disabled} onChange={(v) => update(i, { role: v })} />
              </div>
              <div class="bb-integrations__column">
                <Input label={`File ${n} API Key`} icon="api-key" password value={f.key} placeholder="Personal access token (optional when File 1’s key opens it)" helperText={error(i, 'key') ?? 'Leave empty to reuse File 1’s key.'} error={error(i, 'key') !== undefined} disabled={disabled} maxLength={MAX_TEXT} spellcheck={false} autoComplete="new-password" onValueChange={(v) => update(i, { key: v })} />
                <LinkButton class="bb-integrations__files-remove" disabled={disabled} onClick={() => remove(i)}>{`Remove File ${n}`}</LinkButton>
              </div>
            </div>
          </div>
        )
      })}
      <div class="bb-integrations__files-add">
        <Button variant="secondary" disabled={disabled || files.length >= MAX_EXTRA_FILES} onClick={() => onChange([...files, EMPTY_ROW])}>Add another library file</Button>
        <span class="bb-integrations__files-hint">{files.length >= MAX_EXTRA_FILES ? `Up to ${MAX_EXTRA_FILES + 2} files in all.` : 'Icons, typography, a second components library… each file is read with its own key or File 1’s.'}</span>
      </div>
    </div>
  )
}
