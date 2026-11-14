import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Button, ButtonGroup, Checkbox, DropdownMenu, MenuItem, Notice, Toggle } from '@shared/ui'
import { buildSettingsFile, serializeSettingsFile, settingsFileName, type IntegrationId, type IntegrationSettings } from '@shared/integrations'
import { downloadText } from '@shared/download'
import { appliedMessage, exportRows, fileMeta, summarizeImport } from './settingsFileView'
import { DropZone, FilePicker, FileRow, ImportRows, SettingsDialog } from './SettingsFileParts'
import { useSettingsImport, type ImportFile } from './useSettingsImport'
import './TeamSetup.css'

export interface TeamSetupProps {
  /** Every section as the plugin acts on it: what an export writes and what an import is compared with. */
  settings: IntegrationSettings
  brandId?: string | null
  brandLabel?: string
  /** Applies a file through the store; omit to offer export only. */
  importFile?: ImportFile
  /** The store's answer after an import, so the sections above can show it. */
  onImported?: (settings: IntegrationSettings) => void
}

type ExportState =
  | { kind: 'choosing'; off: readonly IntegrationId[]; includeKeys: boolean }
  | { kind: 'saved'; name: string; count: number; includeKeys: boolean }
  | { kind: 'failed' }
type Open = { kind: 'none' } | { kind: 'menu' } | { kind: 'export'; state: ExportState } | { kind: 'import' }

const DESCRIPTION = 'Save the connections on this page as one JSON file and share it with your team. They import it and skip the manual setup.'
const NEW_EXPORT: ExportState = { kind: 'choosing', off: [], includeKeys: true }

/**
 * Figma "Settings · Team setup file" (40002763:18616): one Import / export button whose menu
 * opens a pop-up for each. Keys travel with the file by default; personal Figma tokens never do.
 */
export function TeamSetup({ settings, brandId, brandLabel, importFile, onImported }: TeamSetupProps) {
  const [open, setOpen] = useState<Open>({ kind: 'none' })
  const [keepExisting, setKeepExisting] = useState(true)
  const imports = useSettingsImport(importFile)
  const state = imports.state
  const anchor = useRef<HTMLDivElement>(null)
  const exporting = open.kind === 'export' ? open.state : null
  const includeKeys = exporting?.kind === 'choosing' ? exporting.includeKeys : true
  const rows = useMemo(() => exportRows(settings, includeKeys), [settings, includeKeys])
  const selected = exporting?.kind === 'choosing' ? rows.filter((r) => r.available && !exporting.off.includes(r.id)).map((r) => r.id) : []
  const applying = state.kind === 'review' && state.applying

  // The menu closes on Escape or a click anywhere else.
  const menuOpen = open.kind === 'menu'
  useEffect(() => {
    if (!menuOpen) return undefined
    const close = () => setOpen({ kind: 'none' })
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    const onDown = (event: MouseEvent) => { if (!anchor.current?.contains(event.target as Node)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [menuOpen])

  const close = () => { imports.reset(); setOpen({ kind: 'none' }) }
  const setExport = (next: ExportState) => setOpen({ kind: 'export', state: next })
  const save = () => {
    if (exporting?.kind !== 'choosing' || selected.length === 0) return
    const name = settingsFileName(brandId)
    const text = serializeSettingsFile(buildSettingsFile(settings, { sections: selected, includeKeys: exporting.includeKeys, brand: brandLabel }))
    setExport(downloadText(name, text, 'application/json') ? { kind: 'saved', name, count: selected.length, includeKeys: exporting.includeKeys } : { kind: 'failed' })
  }
  const apply = async () => {
    const next = await imports.apply(keepExisting)
    if (next) onImported?.(next)
  }

  return (
    <section class="bb-team-setup" aria-label="Team setup file">
      <div class="bb-team-setup__head">
        <Toggle showSwitch={false} title="Team setup file" description={DESCRIPTION} />
        <div ref={anchor} class="bb-team-setup__anchor">
          {importFile ? (
            <Button variant="secondary" trailingIcon="dropdown-down" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setOpen(menuOpen ? { kind: 'none' } : { kind: 'menu' })}>Import / export</Button>
          ) : (
            <Button variant="secondary" onClick={() => setExport(NEW_EXPORT)}>Export settings</Button>
          )}
          {menuOpen && (
            <DropdownMenu class="bb-team-setup__menu" aria-label="Import or export settings">
              <MenuItem label="Import settings" icon="json" onSelect={() => { imports.reset(); setOpen({ kind: 'import' }) }} />
              <MenuItem label="Export settings" icon="json" onSelect={() => setExport(NEW_EXPORT)} />
            </DropdownMenu>
          )}
        </div>
      </div>

      {exporting && (
        <SettingsDialog title="Export settings" description={exporting.kind === 'saved' ? 'Your team setup file is ready to share.' : 'Choose what goes in the team setup file, then share it with your team.'} onClose={close}>
          {exporting.kind === 'choosing' && (
            <>
              <fieldset class="bb-team-setup__list">
                <legend class="bb-team-setup__label">What goes in the file</legend>
                {rows.map((row) => (
                  <div key={row.id} class="bb-team-setup__row">
                    <Checkbox
                      label={row.title} disabled={!row.available} checked={row.available && !exporting.off.includes(row.id)}
                      onChange={(on) => setExport({ ...exporting, off: on ? exporting.off.filter((id) => id !== row.id) : [...exporting.off, row.id] })}
                    />
                    <span class="bb-team-setup__detail">{row.detail}</span>
                  </div>
                ))}
              </fieldset>
              <Toggle
                title="Include API keys and tokens" checked={exporting.includeKeys} onChange={(on) => setExport({ ...exporting, includeKeys: on })}
                description="On: the GitHub, Zeroheight, Jira and AI provider keys travel in the file, so your team has nothing to fill in. They are written as plain text: share the file only in a private channel. Turn off to leave keys out."
              />
              <Notice tone="info" title="Your Figma token stays with you">
                Dual File Mode keys are personal access tokens, so they are never written to the file. Each designer pastes their own after importing.
              </Notice>
              <ButtonGroup
                secondaryLabel="Cancel" onSecondary={close}
                primaryLabel={`Export ${selected.length} section${selected.length === 1 ? '' : 's'}`} primaryDisabled={selected.length === 0} onPrimary={save}
              />
            </>
          )}
          {exporting.kind === 'saved' && (
            <>
              <Notice tone="info" title={`Saved ${exporting.name}`}>
                {`${exporting.count} section${exporting.count === 1 ? '' : 's'}${exporting.includeKeys ? ' with their API keys. Send the file to your team in a private channel' : ', API keys left out. Send the file to your team'}: they import it here, or on the team setup screen after the product tour.`}
              </Notice>
              <ButtonGroup showSecondary={false} primaryLabel="Done" onPrimary={close} />
            </>
          )}
          {exporting.kind === 'failed' && (
            <>
              <Notice tone="error" title="The file couldn’t be saved">Your browser blocked the download. Try again, or open the plugin in the Figma desktop app.</Notice>
              <ButtonGroup secondaryLabel="Close" onSecondary={close} primaryLabel="Try again" onPrimary={() => setExport(NEW_EXPORT)} />
            </>
          )}
        </SettingsDialog>
      )}

      {open.kind === 'import' && (
        <FilePicker onFile={(file) => { void imports.choose(file) }}>
          {(pick) => (
            <SettingsDialog
              title="Import settings" onClose={applying ? undefined : close}
              description={state.kind === 'review' ? 'Check what this file will set up. Nothing is saved until you apply.' : state.kind === 'applied' ? 'Your settings were updated from the file.' : 'Add the team setup file your design system lead exported. You review it before anything is saved.'}
            >
              {state.kind === 'idle' && (
                <>
                  <DropZone heading="Drop your team settings file here" action="Choose file" onChoose={pick} onFile={(file) => { void imports.choose(file) }} />
                  <ButtonGroup showSecondary={false} primaryLabel="Cancel" onPrimary={close} />
                </>
              )}
              {state.kind === 'review' && (
                <>
                  <FileRow name={state.name} meta={fileMeta(state.file)} />
                  <span class="bb-team-setup__label">What this file sets up</span>
                  <ImportRows label="Sections in the file" rows={summarizeImport(state.file, settings, keepExisting).rows} />
                  <Toggle
                    title="Keep values I already entered" checked={keepExisting} onChange={setKeepExisting}
                    description="On: the file only fills fields that are empty. Off: it replaces everything it contains. Sections that are not in the file are never touched."
                  />
                  {state.error && <Notice tone="error" title="The settings weren’t imported">{state.error}</Notice>}
                  <ButtonGroup secondaryLabel="Cancel" onSecondary={close} secondaryDisabled={state.applying} primaryLabel="Apply settings" primaryLoading={state.applying} onPrimary={() => { void apply() }} />
                </>
              )}
              {state.kind === 'applied' && (
                <>
                  <Notice tone="info" title="Settings imported">{appliedMessage(state.summary, state.name)}</Notice>
                  {state.summary.needsKey + state.summary.skipped > 0 && (
                    <>
                      <span class="bb-team-setup__label">Still needs you</span>
                      <ImportRows label="Sections that still need you" rows={state.summary.rows.filter((r) => r.status !== 'pass')} />
                    </>
                  )}
                  <ButtonGroup showSecondary={false} primaryLabel="Done" onPrimary={close} />
                </>
              )}
              {state.kind === 'invalid' && (
                <>
                  <FileRow name={state.name} meta="Chosen just now" />
                  <Notice tone="error" title="This file can’t be imported">{`${state.message} Ask your design system lead for the file they exported from Settings.`}</Notice>
                  <DropZone heading="Drop the right file here" action="Choose another file" onChoose={pick} onFile={(file) => { void imports.choose(file) }} />
                  <ButtonGroup showSecondary={false} primaryLabel="Cancel" onPrimary={close} />
                </>
              )}
            </SettingsDialog>
          )}
        </FilePicker>
      )}
    </section>
  )
}
