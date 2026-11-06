import { useEffect, useMemo, useState } from 'preact/hooks'
import { BrandLogo, Button, Icon, Notice, Spinner } from '@shared/ui'
import { BRANDS, type BrandId } from '@shared/brand'
import { brandTabRows, config as bundledConfig, loadConfig, resolvePersonas, type PluginConfig } from '@shared/config'
import { INTEGRATION_IDS, type IntegrationId } from '@shared/integrations'
import { SECTIONS } from '@shell/integrations/sections'
import { TabOrderList } from './TabOrderList'
import { PersonaMatrix } from './PersonaMatrix'
import { IntegrationModes } from './IntegrationModes'
import { dirtyBrands, draftsFrom, invalidSections, patchFor, setPersonaTab, tabRows, withDraft, type BrandDraft, type Drafts, type FieldValues } from './draft'
import { loadPluginConfig, savePluginConfig } from './api'
import { BuildPrompt, isBuildPending, markBuildPending } from './BuildPrompt'
import '@shell/SettingsIntegrations.css'
import './config.css'

export interface ConfigPageProps {
  brandId: string
  onBrand: (id: string) => void
  /** Open Dev mode signed in to this brand. */
  onPreview: (id: string) => void
}

type Load = { kind: 'loading' } | { kind: 'ready' } | { kind: 'failed'; message: string }
type Save = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'failed'; message: string }

const sectionTitle = (id: IntegrationId) => SECTIONS.find((s) => s.id === id)?.title ?? id

/**
 * dev.html › Plugin configuration: per brand, which tabs show and in what order, which features
 * each persona gets, and which Settings sections this page sets for everyone instead of each person in the plugin.
 * Saving writes plugin.config.json through the dev server; the next build ships it.
 */
export function ConfigPage({ brandId, onBrand, onPreview }: ConfigPageProps) {
  const [config, setConfig] = useState<PluginConfig>(bundledConfig)
  const [saved, setSaved] = useState<Drafts>(() => draftsFrom(bundledConfig))
  const [drafts, setDrafts] = useState<Drafts>(saved)
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [save, setSave] = useState<Save>({ kind: 'idle' })
  // Open again after the reload a Save triggers, until it's dismissed.
  const [buildPrompt, setBuildPrompt] = useState(isBuildPending)

  // The file on disk, not the bundled copy: it may have changed since this page loaded.
  useEffect(() => {
    let live = true
    loadPluginConfig()
      .then((raw) => {
        if (!live) return
        const next = loadConfig(raw)
        setConfig(next); setSaved(draftsFrom(next)); setDrafts(draftsFrom(next)); setLoad({ kind: 'ready' })
      })
      .catch((error: unknown) => { if (live) setLoad({ kind: 'failed', message: error instanceof Error ? error.message : 'Unknown error' }) })
    return () => { live = false }
  }, [])

  const brands = Object.entries(config.brand.brands)
  const current = config.brand.brands[brandId] ? brandId : brands[0]?.[0] ?? ''
  const draft = drafts[current]
  const dirty = dirtyBrands(drafts, saved)
  const invalid = invalidSections(drafts)
  // loadConfig refuses a brand with no tab left in any persona; say so before Save does.
  const tabless = Object.keys(drafts).filter((id) => resolvePersonas(withDraft(config, id, drafts[id]!), id).length === 0)
  // The draft, not the saved file, so "Shown to" follows the persona ticks as they change.
  const preview = useMemo(() => (draft ? withDraft(config, current, draft) : config), [config, current, draft])
  const info = useMemo(() => new Map(brandTabRows(preview, current).map((row) => [row.id, row])), [preview, current])

  const update = (next: Partial<BrandDraft>) => {
    setDrafts((d) => ({ ...d, [current]: { ...d[current]!, ...next } }))
    if (save.kind !== 'saving') setSave({ kind: 'idle' })
  }
  const setSection = (section: IntegrationId, values: FieldValues | undefined) => {
    const { [section]: _dropped, ...rest } = draft!.managed
    update({ managed: values ? { ...rest, [section]: values } : rest })
  }

  const onSave = async () => {
    setSave({ kind: 'saving' })
    try {
      const next = loadConfig(await savePluginConfig(patchFor(drafts, saved)))
      setConfig(next); setSaved(draftsFrom(next)); setDrafts(draftsFrom(next))
      setSave({ kind: 'saved' })
      markBuildPending()
      setBuildPrompt(true)
    } catch (error: unknown) {
      setSave({ kind: 'failed', message: error instanceof Error ? error.message : 'Saving failed. Try again.' })
    }
  }

  if (load.kind === 'loading') return <div class="cfg-center"><Spinner tone="accent" label="Reading plugin.config.json" /></div>

  const brandLabel = (id: string) => config.brand.brands[id]?.label ?? id
  const status = (() => {
    if (save.kind === 'saving') return { tone: 'none', text: 'Saving…' }
    if (save.kind === 'saved') return { tone: 'good', text: 'Saved to plugin.config.json. Build the plugin to use it in Figma.' }
    if (save.kind === 'failed') return { tone: 'error', text: `Couldn’t save: ${save.message}` }
    if (tabless.length) return { tone: 'error', text: `${tabless.map(brandLabel).join(', ')}: turn at least one tab on.` }
    if (invalid.length) return { tone: 'error', text: `Fix ${invalid.map((x) => `${brandLabel(x.brandId)} › ${sectionTitle(x.section)}`).join(', ')} before saving.` }
    if (dirty.length) return { tone: 'warn', text: `Unsaved changes: ${dirty.map(brandLabel).join(', ')}` }
    return { tone: 'none', text: 'No unsaved changes.' }
  })()

  return (
    <div class="dh-page">
      <header class="dh-page__header">
        <div class="dh-page__heading">
          <h1 class="dh-page__title">Plugin configuration</h1>
          <span class="dh-page__context">{brandLabel(current)}</span>
        </div>
        <div class="dh-page__actions">
          <button type="button" class="dh-btn" onClick={() => onPreview(current)}><Icon name="show" size="sm" />Preview in Dev mode</button>
        </div>
      </header>

      <div class="dh-split dh-page__body">
        <aside class="dh-rail" aria-label="Brands">
          <div class="dh-rail__title">Brands</div>
          <ul class="cfg-brands">
            {brands.map(([id, b]) => {
              const d = drafts[id]!
              const rows = tabRows(config, id, d)
              const on = rows.filter((r) => r.enabled && config.tabs[r.id]?.enabled).length
              const managed = INTEGRATION_IDS.filter((s) => d.managed[s]).length
              return (
                <li key={id}>
                  <button type="button" class="cfg-brand" aria-current={id === current || undefined} onClick={() => onBrand(id)}>
                    {/* Each chip is scoped to its brand, so it gets that brand's banner colour and logo. */}
                    <span class="cfg-brand__logo" data-brand={id}>{(BRANDS as readonly string[]).includes(id) && <BrandLogo brand={id as BrandId} />}</span>
                    <span class="cfg-brand__text">
                      <span class="cfg-brand__name">{b.label}{dirty.includes(id) && <span class="dh-dot" data-tone="warn" role="img" aria-label="Unsaved changes" />}</span>
                      <span class="dh-meta"><span>{on} of {rows.length} tabs</span><span>{managed ? `${managed} section${managed === 1 ? '' : 's'} managed` : 'Settings in plugin'}</span></span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <main class="dh-page cfg-main">
          {load.kind === 'failed' && (
            <div class="cfg-notice">
              <Notice tone="error" title="Couldn’t read plugin.config.json from the dev server">
                {load.message}. Showing the copy this page was built with; saving needs <code>npm run dev</code>.
              </Notice>
            </div>
          )}

          {draft && (
            <>
              <section class="dh-section" aria-labelledby="cfg-tabs-title">
                <div class="dh-section__head">
                  <div>
                    <h2 id="cfg-tabs-title" class="dh-section__title">Tabs</h2>
                    <p class="dh-section__desc">The order here is the order in the plugin's tab bar. Hidden tabs don't appear for this brand.{draft.tabs === null && ' Not customised: each persona uses its own order.'}</p>
                  </div>
                  {draft.tabs !== null && <button type="button" class="dh-btn" data-variant="quiet" onClick={() => update({ tabs: null })}>Use persona order</button>}
                </div>
                <TabOrderList rows={tabRows(config, current, draft)} info={info} onChange={(tabs) => update({ tabs })} />
              </section>

              <section class="dh-section" aria-labelledby="cfg-personas-title">
                <div class="dh-section__head">
                  <div>
                    <h2 id="cfg-personas-title" class="dh-section__title">Personas</h2>
                    <p class="dh-section__desc">Tick the features each persona gets in this brand. A persona with none isn't offered in the picker.{draft.personas === null && ' Not customised: every persona uses the defaults.'}</p>
                  </div>
                  {draft.personas !== null && <button type="button" class="dh-btn" data-variant="quiet" onClick={() => update({ personas: null })}>Use default personas</button>}
                </div>
                <PersonaMatrix config={preview} brandId={current} rows={tabRows(config, current, draft)} info={info} onToggle={(personaId, tabId, on) => update({ personas: setPersonaTab(config, current, draft, personaId, tabId, on) })} />
              </section>

              <section class="dh-section" aria-labelledby="cfg-settings-title">
                <div class="dh-section__head">
                  <div>
                    <h2 id="cfg-settings-title" class="dh-section__title">Settings</h2>
                    <p class="dh-section__desc">Managed sections are set once for everyone in this brand and locked in the plugin. API keys and tokens are always entered by each person in the plugin.</p>
                  </div>
                </div>
                <IntegrationModes managed={draft.managed} onChange={setSection} />
              </section>
            </>
          )}

          <footer class="dh-bar" aria-live="polite">
            <span class="dh-bar__status" data-tone={status.tone === 'error' ? 'error' : undefined}>
              {status.tone !== 'none' && <span class="dh-dot" data-tone={status.tone === 'error' ? 'bad' : status.tone} aria-hidden="true" />}
              {status.text}
            </span>
            <button type="button" class="dh-btn" disabled={!dirty.length || save.kind === 'saving'} onClick={() => { setDrafts(saved); setSave({ kind: 'idle' }) }}>Discard</button>
            <Button variant="primary" disabled={!dirty.length || invalid.length > 0 || tabless.length > 0 || load.kind === 'failed'} loading={save.kind === 'saving'} onClick={() => { void onSave() }}>Save</Button>
          </footer>
        </main>
      </div>
      <BuildPrompt open={buildPrompt} onClose={() => setBuildPrompt(false)} />
    </div>
  )
}
