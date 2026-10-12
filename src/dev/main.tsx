// dev.html: two pages over the same plugin.
//   Dev mode (default)              the plugin framed at its real size, with fixture knobs
//   Plugin configuration (?view=config) per-brand tabs and Settings, saved to plugin.config.json
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { brand as activeBrand } from '@shared/config'
import type { BrandId } from '@shared/brand'
import { BrandLogo } from '@shared/ui'
import { DevMode } from './DevMode'
import { ConfigPage } from './config/ConfigPage'
import { AnalyticsPage } from './analytics/AnalyticsPage'
import './harness.css'

type View = 'dev' | 'config' | 'analytics'
const VIEWS: readonly View[] = ['dev', 'config', 'analytics']

/** The web UI around the plugin always wears Bridge; only the framed plugin switches brand. */
const HARNESS_BRAND: BrandId = 'bridge'
document.documentElement.dataset.brand = HARNESS_BRAND

function readView(): { view: View; brand: string } {
  const q = new URLSearchParams(location.search)
  const view = q.get('view') as View | null
  return { view: view && VIEWS.includes(view) ? view : 'dev', brand: q.get('brand') ?? activeBrand.id }
}

/** Local dev tool, no accounts: the avatar marks where a signed-in profile would sit. */
function ProfileAvatar() {
  return (
    <span class="dh-nav__avatar" role="img" aria-label="Profile" title="Profile">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
      </svg>
    </span>
  )
}

function Harness() {
  const [{ view, brand }, setState] = useState(readView)

  useEffect(() => {
    const onPop = () => setState(readView())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = (next: View, nextBrand: string, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(next === 'dev' ? { brand: nextBrand, ...extra } : { view: next, brand: nextBrand })
    history.pushState(null, '', `/dev.html?${q}`)
    setState({ view: next, brand: nextBrand })
  }

  return (
    <div class="dh-shell">
      <header class="dh-nav">
        <a class="dh-nav__brand" href="/dev.html" aria-label="Bridge developer tools, home">
          <BrandLogo brand={HARNESS_BRAND} title="Bridge" />
          <span class="dh-nav__product">Plugin developer tools</span>
        </a>
        <nav class="dh-nav__tabs" role="tablist" aria-label="Pages">
          <button type="button" role="tab" class="dh-nav__tab" aria-selected={view === 'dev'} onClick={() => go('dev', brand, { session: brand })}>Dev mode</button>
          <button type="button" role="tab" class="dh-nav__tab" aria-selected={view === 'config'} onClick={() => go('config', brand)}>Plugin configuration</button>
          <button type="button" role="tab" class="dh-nav__tab" aria-selected={view === 'analytics'} onClick={() => go('analytics', brand)}>Analytics</button>
        </nav>
        <span class="dh-nav__divider" aria-hidden="true" />
        <ProfileAvatar />
      </header>
      <div class="dh-shell__page">
        {view === 'dev'
          // Keyed on the URL brand so "Preview in Dev mode" re-reads the knobs from the query.
          ? <DevMode key={brand} />
          : view === 'config'
            ? <ConfigPage brandId={brand} onBrand={(id) => go('config', id)} onPreview={(id) => go('dev', id, { session: id })} />
            : <AnalyticsPage />}
      </div>
    </div>
  )
}

render(<Harness />, document.getElementById('root')!)
