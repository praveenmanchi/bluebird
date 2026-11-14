import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, Notice } from '@shared/ui'
import { loadConfig, type PluginConfig } from '@shared/config'
import { saveDeployment } from './api'
import { deployDraftFrom, deployPatchFor, packageCommand, pluginIdError, withBrand, type DeployDraft } from './deployment'

export interface DeploymentDialogProps {
  open: boolean
  config: PluginConfig
  onClose: () => void
  /** The config as stored after a save. */
  onSaved: (config: PluginConfig) => void
}

type Save = { kind: 'idle' } | { kind: 'saving' } | { kind: 'failed'; message: string }

/**
 * Plugin configuration › Deployment. Multi-brand ships every brand behind access codes; Single
 * brand ships one brand that opens without signing in, for publishing inside that client's own
 * Figma organisation. The plugin id and name are what that organisation's Figma created.
 */
export function DeploymentDialog({ open, config, onClose, onSaved }: DeploymentDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<DeployDraft>(() => deployDraftFrom(config))
  const [save, setSave] = useState<Save>({ kind: 'idle' })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) { setDraft(deployDraftFrom(config)); setSave({ kind: 'idle' }) }
    // showModal is missing in older engines (and jsdom): fall back to a plain open dialog.
    if (open && !dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '') }
    if (!open && dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open') }
  }, [open])

  const single = draft.mode === 'single'
  const idError = single ? pluginIdError(draft.pluginId) : null
  const brands = Object.entries(config.brand.brands)
  const label = config.brand.brands[draft.brand]?.label ?? draft.brand

  const onSave = async () => {
    setSave({ kind: 'saving' })
    try {
      onSaved(loadConfig(await saveDeployment(deployPatchFor(draft))))
    } catch (error: unknown) {
      setSave({ kind: 'failed', message: error instanceof Error ? error.message : 'Saving failed. Try again.' })
    }
  }

  return (
    <dialog ref={ref} class="cfg-dialog cfg-deploy" aria-labelledby="cfg-deploy-title" onCancel={(e) => { e.preventDefault(); if (save.kind !== 'saving') onClose() }}>
      <h2 id="cfg-deploy-title" class="cfg-dialog__title">Deployment</h2>
      <p class="cfg-dialog__body">Who the next build is for. Your own environment uses Multi-brand. A client that publishes the plugin in its own Figma organisation gets a Single brand build.</p>

      <div class="dh-seg" role="group" aria-label="Deployment mode">
        <button type="button" aria-pressed={!single} onClick={() => setDraft({ ...draft, mode: 'multi' })}>Multi-brand</button>
        <button type="button" aria-pressed={single} onClick={() => setDraft({ ...draft, mode: 'single' })}>Single brand</button>
      </div>

      {single ? (
        <div class="cfg-deploy__fields">
          <label class="dh-row">
            <span class="dh-row__label">Brand</span>
            <span class="dh-row__control">
              <select class="dh-control" value={draft.brand} onChange={(e) => setDraft(withBrand(config, draft, (e.target as HTMLSelectElement).value))}>
                {brands.map(([id, b]) => <option key={id} value={id}>{b.label}</option>)}
              </select>
            </span>
          </label>
          <label class="dh-row">
            <span class="dh-row__label">Figma plugin ID</span>
            <span class="dh-row__control">
              <input class="dh-control" inputMode="numeric" placeholder="From manifest.json" value={draft.pluginId} aria-invalid={idError ? true : undefined} onInput={(e) => setDraft({ ...draft, pluginId: (e.target as HTMLInputElement).value })} />
            </span>
          </label>
          <label class="dh-row">
            <span class="dh-row__label">Plugin name</span>
            <span class="dh-row__control">
              <input class="dh-control" placeholder="From manifest.json" value={draft.pluginName} onInput={(e) => setDraft({ ...draft, pluginName: (e.target as HTMLInputElement).value })} />
            </span>
          </label>
          {idError && <p class="cfg-dialog__hint" data-tone="error">{idError}</p>}
          <ul class="cfg-deploy__list">
            <li>Opens straight into {label}: no access code and no Sign out.</li>
            <li>The other brands’ names, logos, colours and access codes are left out of the build.</li>
            <li>The plugin ID and name come from the plugin created in {label}’s Figma (Plugins › Development › New plugin). Left empty, the package keeps this repo’s manifest values.</li>
          </ul>
        </div>
      ) : (
        <ul class="cfg-deploy__list">
          <li>Every brand ships in one plugin, and each person’s access code picks the brand.</li>
          <li>Single-brand packages can still be made without changing this: <code>BB_DEPLOY=&lt;brand&gt; npm run package</code>.</li>
        </ul>
      )}

      <p class="cfg-dialog__hint">From a terminal: <code>{packageCommand(draft)}</code></p>
      {save.kind === 'failed' && <Notice tone="error" title="Couldn’t save the deployment">{save.message}</Notice>}

      <div class="cfg-dialog__actions">
        <Button variant="secondary" onClick={onClose} disabled={save.kind === 'saving'}>Cancel</Button>
        <Button variant="primary" loading={save.kind === 'saving'} disabled={save.kind === 'saving' || idError !== null} onClick={() => { void onSave() }}>Save</Button>
      </div>
    </dialog>
  )
}
