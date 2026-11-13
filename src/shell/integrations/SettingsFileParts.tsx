import type { JSX } from 'preact'
import { useRef } from 'preact/hooks'
import { CheckItem, Icon } from '@shared/ui'
import type { ImportRow } from './settingsFileView'
import './SettingsFileParts.css'

export interface FileRowProps { name: string; meta: string }

/** Figma "File row": the chosen file with where it came from. */
export function FileRow({ name, meta }: FileRowProps) {
  return (
    <div class="bb-settings-file">
      <Icon name="json" class="bb-settings-file__icon" />
      <div class="bb-settings-file__text">
        <span class="bb-settings-file__name">{name}</span>
        <span class="bb-settings-file__meta">{meta}</span>
      </div>
    </div>
  )
}

export interface ImportRowsProps { rows: readonly ImportRow[]; label: string }

/** One Check Item per section in the file: ready, waiting for a key, or left out. */
export function ImportRows({ rows, label }: ImportRowsProps) {
  return (
    <ul class="bb-settings-file__rows" aria-label={label}>
      {rows.map((row) => (
        <li key={row.id}><CheckItem status={row.status} title={row.title} detail={row.detail} showAction={false} /></li>
      ))}
    </ul>
  )
}

export interface FilePickerProps {
  /** Receives the picked file; the input is cleared so the same file can be picked again. */
  onFile: (file: File) => void
  children: (open: () => void) => JSX.Element
}

/** A hidden file input plus whatever opens it. */
export function FilePicker({ onFile, children }: FilePickerProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input} class="bb-settings-file__input" type="file" accept="application/json,.json" aria-label="Settings file" tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) onFile(file)
        }}
      />
      {children(() => input.current?.click())}
    </>
  )
}
