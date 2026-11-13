import { useMemo, useState } from 'preact/hooks'
import { Button, ButtonGroup, Checkbox, Notice, Toggle } from '@shared/ui'
import { buildSettingsFile, serializeSettingsFile, settingsFileName, type IntegrationId, type IntegrationSettings } from '@shared/integrations'
import { downloadText } from '@shared/download'
import { appliedMessage, exportRows, fileMeta, summarizeImport } from './settingsFileView'
import { FilePicker, FileRow, ImportRows } from './SettingsFileParts'
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
  | { kind: 'closed' }
  | { kind: 'choosing'; off: readonly IntegrationId[]; includeKeys: boolean }
  | { kind: 'saved'; name: string; count: number; includeKeys: boolean }
  | { kind: 'failed' }

const DESCRIPTION = 'Save the connections on this page as one JSON file and share it with your team. They import it and skip the manual setup.'

/**
 * Figma "Settings · Team setup file" (40002763:18616): export Settings › Integrations as one
 * JSON, or import a teammate's. Keys travel with the file by default; personal Figma tokens never do.
 */
export function TeamSetup({ settings, brandId, brandLabel, importFile, onImported }: TeamSetupProps) {
  const [exporting, setExporting] = useState<ExportState>({ kind: 'closed' })
  const [keepExisting, setKeepExisting] = useState(true)
  const imports = useSettingsImport(importFile)
  const state = imports.state
  const includeKeys = exporting.kind === 'choosing' ? exporting.includeKeys : true
  const rows = useMemo(() => exportRows(settings, includeKeys), [settings, includeKeys])
  const idle = exporting.kind !== 'choosing' && (state.kind === 'idle' || state.kind === 'applied')

  const startExport = () => { imports.reset(); setExporting({ kind: 'choosing', off: [], includeKeys: true }) }
  const onFile = (file: File) => { setExporting({ kind: 'closed' }); void imports.choose(file) }
  const selected = exporting.kind === 'choosing' ? rows.filter((r) => r.available && !exporting.off.includes(r.id)).map((r) => r.id) : []

  const save = () => {
    if (exporting.kind !== 'choosing' || selected.length === 0) return
    const name = settingsFileName(brandId)
    const text = serializeSettingsFile(buildSettingsFile(settings, { sections: selected, includeKeys: exporting.includeKeys, brand: brandLabel }))
    setExporting(downloadText(name, text, 'application/json') ? { kind: 'saved', name, count: selected.length, includeKeys: exporting.includeKeys } : { kind: 'failed' })
  }
  const apply = async () => {
    const next = await imports.apply(keepExisting)
    if (next) onImported?.(next)
  }

  return (
    <section class="bb-team-setup" aria-label="Team setup file">
      <FilePicker onFile={onFile}>
        {(open) => (
          <>
            <div class="bb-team-setup__head">
              <Toggle showSwitch={false} title="Team setup file" description={DESCRIPTION} />
              {idle && (
                <div class="bb-team-setup__buttons">
                  {importFile && <Button variant="secondary" onClick={open}>Import settings</Button>}
                  <Button variant="secondary" onClick={startExport}>Export settings</Button>
                </div>
              )}
            </div>

            {exporting.kind === 'choosing' && (
              <>
                <fieldset class="bb-team-setup__list">
                  <legend class="bb-team-setup__label">What goes in the file</legend>
                  {rows.map((row) => (
                    <div key={row.id} class="bb-team-setup__row">
                      <Checkbox
                        label={row.title} disabled={!row.available} checked={row.available && !exporting.off.includes(row.id)}
                        onChange={(on) => setExporting({ ...exporting, off: on ? exporting.off.filter((id) => id !== row.id) : [...exporting.off, row.id] })}
                      />
                      <span class="bb-team-setup__detail">{row.detail}</span>
                    </div>
                  ))}
                </fieldset>
                <Toggle
                  title="Include API keys and tokens" checked={exporting.includeKeys} onChange={(on) => setExporting({ ...exporting, includeKeys: on })}
                  description="On: the GitHub, Zeroheight, Jira and AI provider keys travel in the file, so your team has nothing to fill in. They are written as plain text: share the file only in a private channel. Turn off to leave keys out."
                />
                <Notice tone="info" title="Your Figma token stays with you">
                  Dual File Mode keys are personal access tokens, so they are never written to the file. Each designer pastes their own after importing.
                </Notice>
                <ButtonGroup
                  secondaryLabel="Cancel" onSecondary={() => setExporting({ kind: 'closed' })}
                  primaryLabel={`Export ${selected.length} section${selected.length === 1 ? '' : 's'}`} primaryDisabled={selected.length === 0} onPrimary={save}
                />
              </>
            )}
            {exporting.kind === 'saved' && state.kind === 'idle' && (
              <Notice tone="info" title={`Saved ${exporting.name}`}>
                {`${exporting.count} section${exporting.count === 1 ? '' : 's'}${exporting.includeKeys ? ' with their API keys. Send the file to your team in a private channel' : ', API keys left out. Send the file to your team'}: they import it here, or on the last step of the product tour.`}
              </Notice>
            )}
            {exporting.kind === 'failed' && state.kind === 'idle' && (
              <Notice tone="error" title="The file couldn’t be saved">Your browser blocked the download. Try again, or open the plugin in the Figma desktop app.</Notice>
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
                <ButtonGroup secondaryLabel="Cancel" onSecondary={imports.reset} secondaryDisabled={state.applying} primaryLabel="Apply settings" primaryLoading={state.applying} onPrimary={() => { void apply() }} />
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
              </>
            )}
            {state.kind === 'invalid' && (
              <>
                <FileRow name={state.name} meta="Chosen just now" />
                <Notice tone="error" title="This file can’t be imported">{`${state.message} Ask your design system lead for the file they exported from Settings.`}</Notice>
                <ButtonGroup secondaryLabel="Cancel" onSecondary={imports.reset} primaryLabel="Choose another file" onPrimary={open} />
              </>
            )}
          </>
        )}
      </FilePicker>
    </section>
  )
}
