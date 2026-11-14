import type { JSX } from 'preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import { Button, CheckItem, Icon } from '@shared/ui'
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

export interface DropZoneProps {
  heading: string
  /** Label of the button that opens the file picker. */
  action: string
  onChoose: () => void
  /** A file dropped on the zone. */
  onFile: (file: File) => void
}

/** Figma "Drop zone": drop the settings file here, or open the picker. */
export function DropZone({ heading, action, onChoose, onFile }: DropZoneProps) {
  const [over, setOver] = useState(false)
  const onDrop = (event: JSX.TargetedDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setOver(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) onFile(file)
  }
  return (
    <div
      class={`bb-settings-file__drop${over ? ' is-over' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}
    >
      <Icon name="json" />
      <span class="bb-settings-file__heading">{heading}</span>
      <span class="bb-settings-file__meta">A .json file exported from Settings › Team setup file</span>
      <Button variant="secondary" onClick={onChoose}>{action}</Button>
    </div>
  )
}

export interface SettingsDialogProps {
  title: string
  description: string
  /** Escape or a click on the scrim; omit while the dialog must stay open (saving). */
  onClose?: () => void
  children: ComponentChildren
}

/** Figma "Dialog · Export settings / Import settings": a pop-up over a scrim, centred in the plugin window. */
export function SettingsDialog({ title, description, onClose, children }: SettingsDialogProps) {
  const root = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  useEffect(() => { root.current?.focus() }, [])
  useEffect(() => {
    if (!onClose) return undefined
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div class="bb-settings-dialog__scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <div ref={root} class="bb-settings-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} tabIndex={-1}>
        <div class="bb-settings-dialog__header">
          <h2 id={titleId} class="bb-settings-dialog__title">{title}</h2>
          <p id={descId} class="bb-settings-file__meta">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
