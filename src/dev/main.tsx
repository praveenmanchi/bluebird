// Dev harness: frames the plugin UI at its real window size in the browser and
// exposes the knobs Figma would otherwise provide (brand mode, window size,
// fixture data, persona, connection state). Loaded from dev.html only.
import { render } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { BRANDS, BRAND_LABELS, type BrandId } from '@shared/brand'
import { brand as activeBrand, personas, WINDOW_PRESETS, WINDOW_BOUNDS, clampWindow, presetFor, type WindowSize } from '@shared/config'
import { readDevParams, SCENARIOS, SCENARIO_LABELS, type Scenario } from '../ui/dev-params'
import type { TransportStatus } from '@shared/bridge'
import './harness.css'

const STATUSES: TransportStatus[] = ['connected', 'connecting', 'disconnected']

function Harness() {
  const initial = useMemo(() => readDevParams(), [])
  const [brand, setBrand] = useState<BrandId>(initial.brand ?? (initial.session && initial.session !== 'none' ? (initial.session as BrandId) : (activeBrand.id as BrandId)))
  const [loggedIn, setLoggedIn] = useState(initial.session !== 'none')
  const [scenario, setScenario] = useState<Scenario>(initial.scenario)
  const [persona, setPersona] = useState(initial.persona ?? personas[0]?.id ?? '')
  const [status, setStatus] = useState<TransportStatus>(initial.status)
  const [size, setSize] = useState<WindowSize>(WINDOW_PRESETS.S)
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

  useEffect(() => { document.documentElement.dataset.brand = brand }, [brand])
  // Keep the framed plugin's own notion of its size in sync when the harness resizes it.
  useEffect(() => { document.querySelector<HTMLIFrameElement>('.dh__frame')?.contentWindow?.postMessage({ type: 'bb:set-size', ...size }, '*') }, [size])
  useEffect(() => {
    const q = new URLSearchParams({ brand, session: loggedIn ? brand : 'none', data: scenario, persona, status })
    history.replaceState(null, '', `/dev.html?${q}`)
  }, [brand, loggedIn, scenario, persona, status])

  const src = `/?mode=mock&embed=1&brand=${brand}&session=${loggedIn ? brand : 'none'}&data=${scenario}&persona=${persona}&status=${status}&r=${reloadKey}`
  const preset = presetFor(size)

  return (
    <div class="dh">
      <aside class="dh__panel">
        <div>
          <div class="dh__title">Bluebird · dev harness</div>
          <div class="dh__hint">The plugin runs in the frame at its real window size. Brand and data come from the fixtures, not Figma.</div>
        </div>
        <label class="dh__field">
          <span class="dh__label">Session · brand</span>
          <select class="dh__select" value={loggedIn ? brand : 'none'} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; if (v === 'none') setLoggedIn(false); else { setBrand(v as BrandId); setLoggedIn(true) } }}>
            <option value="none">Logged out — access-code screen</option>
            {BRANDS.map((b) => <option key={b} value={b}>{BRAND_LABELS[b]} (unlocked)</option>)}
          </select>
          <span class="dh__hint">Access codes are hashed in plugin.config.json; try one on the login screen.</span>
        </label>
        <div class="dh__field">
          <span class="dh__label">Window size</span>
          <div class="dh__row">
            <select class="dh__select" value={preset ?? 'custom'} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value as keyof typeof WINDOW_PRESETS; if (v in WINDOW_PRESETS) setSize(WINDOW_PRESETS[v]) }}>
              {(Object.keys(WINDOW_PRESETS) as (keyof typeof WINDOW_PRESETS)[]).map((k) => <option key={k} value={k}>{k} — {WINDOW_PRESETS[k].width} × {WINDOW_PRESETS[k].height}</option>)}
              {!preset && <option value="custom">Custom</option>}
            </select>
          </div>
          <div class="dh__row">
            <input class="dh__input" type="number" aria-label="Width" min={WINDOW_BOUNDS.minWidth} max={WINDOW_BOUNDS.maxWidth} value={size.width} onChange={(e) => setSize(clampWindow({ ...size, width: Number((e.currentTarget as HTMLInputElement).value) }))} />
            <input class="dh__input" type="number" aria-label="Height" min={WINDOW_BOUNDS.minHeight} max={WINDOW_BOUNDS.maxHeight} value={size.height} onChange={(e) => setSize(clampWindow({ ...size, height: Number((e.currentTarget as HTMLInputElement).value) }))} />
          </div>
          <div class="dh__hint">Bounds {WINDOW_BOUNDS.minWidth}×{WINDOW_BOUNDS.minHeight} to {WINDOW_BOUNDS.maxWidth}×{WINDOW_BOUNDS.maxHeight}. The footer's S / M / L, expand and grip resize the frame too.</div>
        </div>
        <label class="dh__field">
          <span class="dh__label">Fixture data</span>
          <select class="dh__select" value={scenario} onChange={(e) => { setScenario((e.currentTarget as HTMLSelectElement).value as Scenario); setReloadKey((k) => k + 1) }}>
            {SCENARIOS.map((s) => <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>)}
          </select>
        </label>
        <label class="dh__field">
          <span class="dh__label">Persona</span>
          <select class="dh__select" value={persona} onChange={(e) => { setPersona((e.currentTarget as HTMLSelectElement).value); setReloadKey((k) => k + 1) }}>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label class="dh__field">
          <span class="dh__label">Connection</span>
          <select class="dh__select" value={status} onChange={(e) => { setStatus((e.currentTarget as HTMLSelectElement).value as TransportStatus); setReloadKey((k) => k + 1) }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" class="dh__select" onClick={() => setReloadKey((k) => k + 1)}>Reload plugin</button>
        <div class="dh__hint">Storybook (per-component, all brands) runs on port 6006 · live mode against Figma: <code>/?mode=live</code>.</div>
      </aside>
      <main class="dh__stage">
        <div class="dh__window" style={{ width: `${size.width}px` }}>
          <div class="dh__titlebar">
            <span>Bluebird</span>
            <span class="dh__size">{size.width} × {size.height}{preset ? ` · ${preset}` : ''}</span>
          </div>
          <iframe key={reloadKey} class="dh__frame" title="Bluebird plugin" src={src} style={{ width: `${size.width}px`, height: `${size.height}px` }} />
        </div>
      </main>
    </div>
  )
}

render(<Harness />, document.getElementById('root')!)
