import { Notice } from '@shared/ui'
import type { IntegrationSettings } from '@shared/integrations'
import { DropZone, FileRow, ImportRows } from '../integrations/SettingsFileParts'
import { appliedMessage, fileMeta, summarizeImport } from '../integrations/settingsFileView'
import type { ImportState } from '../integrations/useSettingsImport'
import './ImportStep.css'

export interface ImportStepProps {
  state: ImportState
  /** The person's settings now, to say what the file will leave waiting for a key. */
  current: IntegrationSettings
  /** Opens the file picker. */
  onChoose: () => void
  /** A file dropped on the drop zone. */
  onFile: (file: File) => void
}

export interface ImportCopy { title: string; body: string; next: string }

/** Title, description and primary button of the step, which follow what happened to the file. */
export function importCopy(state: ImportState, fallback: Pick<ImportCopy, 'title' | 'body'>): ImportCopy {
  if (state.kind === 'review') return { title: 'Check what will be set up', body: 'Nothing is saved until you apply. Values you already entered are kept; only your personal Figma token is left for you to add.', next: 'Apply and finish' }
  if (state.kind === 'applied') {
    const { ready, needsKey } = state.summary
    const waiting = needsKey > 0 ? ` ${needsKey} ${needsKey === 1 ? 'needs' : 'need'} a key from you: add ${needsKey === 1 ? 'it' : 'them'} in Settings whenever you’re ready.` : ''
    return { title: 'You’re set up', body: `${ready} ${ready === 1 ? 'connection is' : 'connections are'} ready to use.${waiting}`, next: 'Get started' }
  }
  if (state.kind === 'invalid') return { title: 'That file didn’t work', body: 'Pick the file your design system lead exported, or skip and fill in Settings by hand. You can import it later from Settings too.', next: 'Choose another file' }
  return { ...fallback, next: 'Choose file' }
}

/** Figma "Team setup · 1 Import settings" and its Review / All set / File not valid states (40002766:16928 …17874). */
export function ImportStep({ state, current, onChoose, onFile }: ImportStepProps) {
  return (
    <div class="bb-ob-import">
      {state.kind === 'idle' && (
        <>
          <DropZone heading="Drop your team settings file here" action="Choose file" onChoose={onChoose} onFile={onFile} />
          <p class="bb-ob-import__hint bb-ob-import__hint--center">No file? Skip this step. You can fill in Settings by hand, or import the file there later.</p>
        </>
      )}
      {state.kind === 'review' && (() => {
        const summary = summarizeImport(state.file, current, true)
        const total = summary.ready + summary.needsKey
        return (
          <>
            <FileRow name={state.name} meta={fileMeta(state.file)} />
            <span class="bb-ob-import__heading">{`This file sets up ${total} ${total === 1 ? 'connection' : 'connections'}`}</span>
            <ImportRows label="Sections in the file" rows={summary.rows} />
            {state.error && <Notice tone="error" title="The settings weren’t imported">{state.error}</Notice>}
          </>
        )
      })()}
      {state.kind === 'applied' && (() => {
        const ready = state.summary.rows.filter((r) => r.status === 'pass')
        const waiting = state.summary.rows.filter((r) => r.status !== 'pass')
        return (
          <>
            <Notice tone="info" title="Settings imported">{appliedMessage(state.summary, state.name)}</Notice>
            {ready.length > 0 && <><span class="bb-ob-import__heading">Ready to use</span><ImportRows label="Ready to use" rows={ready} /></>}
            {waiting.length > 0 && <><span class="bb-ob-import__heading">Still needs you</span><ImportRows label="Still needs you" rows={waiting} /></>}
          </>
        )
      })()}
      {state.kind === 'invalid' && (
        <>
          <FileRow name={state.name} meta="Chosen just now" />
          <Notice tone="error" title="This file can’t be imported">{state.message}</Notice>
          <DropZone heading="Drop the right file here" action="Choose another file" onChoose={onChoose} onFile={onFile} />
        </>
      )}
    </div>
  )
}
