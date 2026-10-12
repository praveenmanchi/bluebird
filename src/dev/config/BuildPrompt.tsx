import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, Notice, Spinner } from '@shared/ui'
import { getBuild, startBuild, type BuildState } from './api'

export const BUILD_COMMAND = 'npm run build'
const POLL_MS = 1000
/** Survives the reload a Save causes (plugin.config.json is imported by this page). */
const PENDING_KEY = 'bb-dev:build-prompt'

/** When the save happened: a build that started before it doesn't carry it. */
let savedAt = ''
const readPending = (): string => { try { return sessionStorage.getItem(PENDING_KEY) ?? '' } catch { return '' } }

export const markBuildPending = (): void => {
  savedAt = new Date().toISOString()
  try { sessionStorage.setItem(PENDING_KEY, savedAt) } catch { /* private mode: the prompt shows only until the reload */ }
}
export const isBuildPending = (): boolean => (savedAt ||= readPending()) !== ''
const clearBuildPending = (): void => { savedAt = ''; try { sessionStorage.removeItem(PENDING_KEY) } catch { /* nothing stored */ } }

/** A finished build from before the save is history, not this save's build. */
export const forThisSave = (build: BuildState, since: string): BuildState =>
  build.status !== 'idle' && build.status !== 'running' && since && build.startedAt < since ? { status: 'idle' } : build

export interface BuildPromptProps {
  open: boolean
  onClose: () => void
}

type Copy = 'idle' | 'copied' | 'failed'

/** After a Save: the Figma plugin still runs the old config until it's rebuilt. Offers to run the build here. */
export function BuildPrompt({ open, onClose }: BuildPromptProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [build, setBuild] = useState<BuildState>({ status: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [copy, setCopy] = useState<Copy>('idle')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // showModal is missing in older engines (and jsdom): fall back to a plain open dialog.
    if (open && !dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '') }
    if (!open && dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open') }
  }, [open])

  // Pick up a build already under way (the page may have reloaded mid-build), then follow it while it runs.
  useEffect(() => {
    if (!open) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        const next = forThisSave(await getBuild(), savedAt || readPending())
        if (!live) return
        setBuild(next)
        if (next.status === 'running') timer = setTimeout(() => { void poll() }, POLL_MS)
      } catch (e: unknown) {
        if (live) setError(e instanceof Error ? e.message : 'Couldn’t reach the dev server.')
      }
    }
    void poll()
    return () => { live = false; clearTimeout(timer) }
  }, [open, build.status === 'running'])

  const run = async () => {
    setError(null)
    try { setBuild(await startBuild()) } catch (e: unknown) { setError(e instanceof Error ? e.message : 'The build couldn’t start.') }
  }
  const copyCommand = async () => {
    try { await navigator.clipboard.writeText(BUILD_COMMAND); setCopy('copied') } catch { setCopy('failed') }
  }
  const close = () => { clearBuildPending(); onClose() }
  const running = build.status === 'running'

  return (
    <dialog ref={ref} class="cfg-dialog" aria-labelledby="cfg-dialog-title" onCancel={(e) => { e.preventDefault(); if (!running) close() }}>
      <h2 id="cfg-dialog-title" class="cfg-dialog__title">
        {build.status === 'passed' ? 'Plugin rebuilt' : 'Saved. Rebuild the plugin to use it in Figma'}
      </h2>
      <p class="cfg-dialog__body">
        {build.status === 'passed'
          ? 'The Figma plugin now has this configuration. Close and reopen Bluebird in Figma (Plugins › Development › Bluebird) to see it.'
          : <>plugin.config.json is updated and the preview here already uses it. The plugin in Figma is built from the config, so it keeps the old tabs and Settings until you run <code>{BUILD_COMMAND}</code>.</>}
      </p>

      {running && <div class="cfg-dialog__status"><Spinner tone="accent" label="Building" /> Building… this takes about a minute.</div>}
      {build.status === 'failed' && <Notice tone="error" title="The build failed">Nothing in Figma changed. The last lines of output are below.</Notice>}
      {(running || build.status === 'failed') && build.output && <pre class="cfg-dialog__log" aria-label="Build output">{build.output}</pre>}
      {error && <Notice tone="error" title="Couldn’t run the build from here">{error} Run <code>{BUILD_COMMAND}</code> in a terminal instead.</Notice>}
      {copy === 'copied' && <p class="cfg-dialog__hint">Copied. Paste it in a terminal at the repo root.</p>}
      {copy === 'failed' && <p class="cfg-dialog__hint">Copy didn’t work here: type <code>{BUILD_COMMAND}</code> in a terminal at the repo root.</p>}

      <div class="cfg-dialog__actions">
        {build.status !== 'passed' && <Button variant="secondary" onClick={() => { void copyCommand() }} disabled={running}>Copy command</Button>}
        <Button variant="secondary" onClick={close} disabled={running}>{build.status === 'passed' ? 'Done' : 'Later'}</Button>
        {build.status !== 'passed' && (
          <Button variant="primary" loading={running} disabled={running} onClick={() => { void run() }}>
            {build.status === 'failed' ? 'Run build again' : 'Run build now'}
          </Button>
        )}
      </div>
    </dialog>
  )
}
