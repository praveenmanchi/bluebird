// Dev mode: frames the plugin UI at its real window size in the browser and
// exposes the knobs Figma would otherwise provide (brand mode, window size,
// fixture data, persona, connection state). dev.html's first page.
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Icon } from '@shared/ui'
import { BRANDS, BRAND_LABELS, type BrandId } from '@shared/brand'
import { brand as activeBrand, personas, WINDOW_PRESETS, WINDOW_BOUNDS, WINDOW_DEFAULT, clampWindow, presetFor, type WindowPreset, type WindowSize } from '@shared/config'
import { readDevParams, SCENARIOS, SCENARIO_LABELS, type Scenario } from '../ui/dev-params'
import type { TransportStatus } from '@shared/bridge'

const STATUSES: readonly TransportStatus[] = ['connected', 'connecting', 'disconnected']
const STATUS_TONE: Record<TransportStatus, 'good' | 'warn' | 'bad'> = { connected: 'good', connecting: 'warn', disconnected: 'bad' }
const PRESETS = Object.keys(WINDOW_PRESETS) as WindowPreset[]

export function DevMode() {
  const initial = useMemo(() => readDevParams(), [])
  const [brand, setBrand] = useState<BrandId>(initial.brand ?? (initial.session && initial.session !== 'none' ? (initial.session as BrandId) : (activeBrand.id as BrandId)))
  const [loggedIn, setLoggedIn] = useState(initial.session !== 'none')
  const [scenario, setScenario] = useState<Scenario>(initial.scenario)
  const [persona, setPersona] = useState(initial.persona ?? personas[0]?.id ?? '')
  const [status, setStatus] = useState<TransportStatus>(initial.status)
  const [size, setSize] = useState<WindowSize>(WINDOW_PRESETS[WINDOW_DEFAULT])
  const [reloadKey, setReloadKey] = useState(0)

  // The framed plugin sends shell:resize through the mock transport → bb:resize here.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; width?: number; height?: number } | null
      if (d?.type === 'bb:resize' && typeof d.width === 'number' && typeof d.height === 'number') setSize(clampWindow({ width: d.width, height: d.height }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Keep the framed plugin's own notion of its size in sync when the harness resizes it.
  useEffect(() => { document.querySelector<HTMLIFrameElement>('.dm__frame')?.contentWindow?.postMessage({ type: 'bb:set-size', ...size }, '*') }, [size])
  useEffect(() => {
    const q = new URLSearchParams({ brand, session: loggedIn ? brand : 'none', data: scenario, persona, status })
    history.replaceState(null, '', `/dev.html?${q}`)
  }, [brand, loggedIn, scenario, persona, status])

  const reload = () => setReloadKey((k) => k + 1)
  const src = `/?mode=mock&embed=1&brand=${brand}&session=${loggedIn ? brand : 'none'}&data=${scenario}&persona=${persona}&status=${status}&r=${reloadKey}`
  const preset = presetFor(size)
  const setDimension = (key: keyof WindowSize, value: string) => setSize(clampWindow({ ...size, [key]: Number(value) }))

  return (
    <div class="dh-split">
      <aside class="dh-rail" aria-label="Plugin controls">
        <div class="dh-group">
          <h2 class="dh-group__title">Session</h2>
          <div class="dh-row">
            <label class="dh-row__label" for="dm-session">Signed in as</label>
            <div class="dh-row__control">
              <select id="dm-session" class="dh-control" value={loggedIn ? brand : 'none'} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; if (v === 'none') setLoggedIn(false); else { setBrand(v as BrandId); setLoggedIn(true) } }}>
                <option value="none">Signed out</option>
                {BRANDS.map((b) => <option key={b} value={b}>{BRAND_LABELS[b]}</option>)}
              </select>
            </div>
          </div>
          <div class="dh-row">
            <label class="dh-row__label" for="dm-persona">Persona</label>
            <div class="dh-row__control">
              <select id="dm-persona" class="dh-control" value={persona} onChange={(e) => { setPersona((e.currentTarget as HTMLSelectElement).value); reload() }}>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          {!loggedIn && <p class="dh-group__note">Shows the access-code screen. Codes are hashed in plugin.config.json.</p>}
        </div>

        <div class="dh-group">
          <h2 class="dh-group__title">Window</h2>
          <div class="dh-row">
            <span class="dh-row__label">Preset</span>
            <div class="dh-row__control">
              <div class="dh-seg" role="group" aria-label="Window preset">
                {PRESETS.map((k) => <button key={k} type="button" aria-pressed={preset === k} onClick={() => setSize(WINDOW_PRESETS[k])}>{k}</button>)}
              </div>
            </div>
          </div>
          <div class="dh-row">
            <label class="dh-row__label" for="dm-width">Size</label>
            <div class="dh-row__control">
              <input id="dm-width" class="dh-control" type="number" aria-label="Width" min={WINDOW_BOUNDS.minWidth} max={WINDOW_BOUNDS.maxWidth} value={size.width} onChange={(e) => setDimension('width', (e.currentTarget as HTMLInputElement).value)} />
              <span class="dm__times" aria-hidden="true">×</span>
              <input class="dh-control" type="number" aria-label="Height" min={WINDOW_BOUNDS.minHeight} max={WINDOW_BOUNDS.maxHeight} value={size.height} onChange={(e) => setDimension('height', (e.currentTarget as HTMLInputElement).value)} />
            </div>
          </div>
          <p class="dh-group__note">{WINDOW_BOUNDS.minWidth}×{WINDOW_BOUNDS.minHeight} to {WINDOW_BOUNDS.maxWidth}×{WINDOW_BOUNDS.maxHeight}. The plugin's own footer controls resize the frame too.</p>
        </div>

        <div class="dh-group">
          <h2 class="dh-group__title">Data</h2>
          <div class="dh-row">
            <label class="dh-row__label" for="dm-data">Fixture</label>
            <div class="dh-row__control">
              <select id="dm-data" class="dh-control" value={scenario} onChange={(e) => { setScenario((e.currentTarget as HTMLSelectElement).value as Scenario); reload() }}>
                {SCENARIOS.map((s) => <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div class="dh-row">
            <label class="dh-row__label" for="dm-status">Connection</label>
            <div class="dh-row__control">
              <select id="dm-status" class="dh-control" value={status} onChange={(e) => { setStatus((e.currentTarget as HTMLSelectElement).value as TransportStatus); reload() }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <p class="dh-group__note">Brand and data come from fixtures, not Figma. Live mode against Figma: <span class="dh-kbd">/?mode=live</span>.</p>
        </div>
      </aside>

      <section class="dm" aria-label="Plugin preview">
        <div class="dm__toolbar">
          <span class="dh-meta">
            <span>{BRAND_LABELS[brand]}</span>
            <span>{loggedIn ? 'Signed in' : 'Signed out'}</span>
            <span>{size.width} × {size.height}{preset ? ` (${preset})` : ''}</span>
          </span>
          <span class="dm__toolbar-actions">
            <button type="button" class="dh-btn" data-variant="quiet" onClick={() => setSize(WINDOW_PRESETS[WINDOW_DEFAULT])} disabled={preset === WINDOW_DEFAULT}>Reset size</button>
            <a class="dh-btn" data-variant="quiet" href={src.replace('&embed=1', '')} target="_blank" rel="noreferrer">Open in new tab</a>
            <button type="button" class="dh-btn" onClick={reload}><Icon name="status-retry" size="sm" />Reload plugin</button>
          </span>
        </div>
        <div class="dm__stage">
          <div class="dm__window" style={{ width: `${size.width}px` }}>
            <div class="dm__titlebar">
              <span>Bluebird</span>
              <span class="dh-meta"><span>{size.width} × {size.height}</span></span>
            </div>
            <iframe key={reloadKey} class="dm__frame" title="Bluebird plugin" src={src} style={{ width: `${size.width}px`, height: `${size.height}px` }} />
          </div>
        </div>
        <div class="dm__statusbar">
          <span class="dh-meta">
            <span><span class="dh-dot" data-tone={STATUS_TONE[status]} aria-hidden="true" /> {status[0]!.toUpperCase() + status.slice(1)}</span>
            <span>Mock transport</span>
            <span>{SCENARIO_LABELS[scenario]}</span>
          </span>
          <span class="dh-meta"><span>Storybook on port 6006</span></span>
        </div>
      </section>
    </div>
  )
}
