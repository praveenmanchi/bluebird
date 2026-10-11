import type { ComponentChildren } from 'preact'
import { Button } from '../../src/shared/ui/Button/Button'
import { Icon, ICONS, type IconName } from '../../src/shared/ui/Icon/Icon'
import { BrandLogo } from '../../src/shared/ui/BrandLogo/BrandLogo'
import { BRANDS, BRAND_LABELS, FIGMA_COMPONENTS, TOKEN_NAMES, type BrandId } from '../../src/shared/brand/generated/tokens'
import { PageLink, Section, SitePage } from './Site'
import { COMPONENT_GROUPS, PAGES, go, summarise, useStoryIndex, type PageId } from './runtime'
import './home.css'

interface Pillar { to: PageId; icon: IconName; title: string; description: string; preview: ComponentChildren }

const PILLARS: Pillar[] = [
  {
    to: PAGES.colour, icon: 'colors', title: 'Colour',
    description: 'Semantic roles and the primitive ramps behind them, with contrast for every text colour.',
    preview: <span class="bbs-home-dots">{['--bb-surface-accent', '--bb-surface-accent-strong', '--bb-feedback-success', '--bb-feedback-warning', '--bb-feedback-danger'].map((t) => <i key={t} style={{ background: `var(${t})` }} />)}</span>,
  },
  {
    to: PAGES.typography, icon: 'section-typography', title: 'Typography',
    description: 'Font families per brand, the semantic type scale and weights.',
    preview: <span class="bbs-home-aa">Aa</span>,
  },
  {
    to: PAGES.iconography, icon: 'component', title: 'Iconography',
    description: `${Object.keys(ICONS).length} glyphs exported from Figma, searchable and copy-ready.`,
    preview: <span class="bbs-row">{(['search', 'layers', 'variables', 'accessibility', 'settings'] as IconName[]).map((n) => <Icon key={n} name={n} size="lg" />)}</span>,
  },
  {
    to: PAGES.spacing, icon: 'section-spacing-and-sizing', title: 'Spacing & shape',
    description: 'Inset, inline and stack spacing, radii, strokes and component sizes.',
    preview: <span class="bbs-home-bars">{['xs', 'sm', 'md', 'lg', 'xl'].map((s) => <i key={s} style={{ width: `calc(var(--bb-space-inset-${s}) * 4)` }} />)}</span>,
  },
  {
    to: PAGES.brands, icon: 'theme-whole-site', title: 'Brands',
    description: 'Five brand modes from one component library. Compare them side by side.',
    preview: <span class="bbs-home-dots">{BRANDS.map((b) => <i key={b} style={{ background: `var(--bb-${b}-color-brand-primary)` }} />)}</span>,
  },
  {
    to: PAGES.tokens, icon: 'variables', title: 'Token reference',
    description: 'Every generated CSS variable, resolved for the selected brand.',
    preview: <code class="bbs-small bbs-muted">var(--bb-surface-accent)</code>,
  },
]

function Hero() {
  return (
    <section class="bbs-home-hero">
      <p class="bbs-eyebrow">Bluebird · multi-brand Figma plugin</p>
      <h1 class="bbs-home-hero__title">One design system,<br />five brands, zero drift.</h1>
      <p class="bbs-lede">
        Foundations, components and patterns for Bluebird. Everything here is generated from the Figma variables, so what you
        see is exactly what ships in the plugin.
      </p>
      <div class="bbs-row">
        <Button size="lg" onClick={(e) => go(PAGES.colour, e)}>Explore the style guide</Button>
        <Button size="lg" variant="secondary" onClick={(e) => go(PAGES.components, e)}>Browse components</Button>
      </div>
    </section>
  )
}

function Stats() {
  const stats = [
    { value: TOKEN_NAMES.length, label: 'design tokens' },
    { value: Object.keys(FIGMA_COMPONENTS).length, label: 'Figma component sets' },
    { value: Object.keys(ICONS).length, label: 'icons' },
    { value: BRANDS.length, label: 'brand modes' },
  ]
  return (
    <dl class="bbs-home-stats">
      {stats.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ComponentGroups() {
  const index = useStoryIndex()
  const summaries = index.status === 'ready' ? summarise(index.entries) : []
  return (
    <div class="bbs-grid">
      {COMPONENT_GROUPS.map((group) => {
        const items = summaries.filter((s) => s.group === group)
        return (
          <PageLink key={group} to={PAGES.components} class="bbs-card">
            <h3 class="bbs-card__title">{group}</h3>
            <p class="bbs-card__desc">
              {index.status === 'loading' ? 'Loading…' : `${items.length} components · ${items.reduce((n, s) => n + s.stories, 0)} stories`}
            </p>
            <p class="bbs-small bbs-muted">{items.slice(0, 4).map((s) => s.name).join(', ')}{items.length > 4 ? '…' : ''}</p>
          </PageLink>
        )
      })}
    </div>
  )
}

function BrandStrip({ current, setBrand }: { current: BrandId; setBrand: (b: BrandId) => void }) {
  return (
    <div class="bbs-home-brands">
      {BRANDS.map((brand: BrandId) => (
        <button key={brand} type="button" data-brand={brand} aria-pressed={brand === current} onClick={() => setBrand(brand)} title={`Preview in ${BRAND_LABELS[brand]}`}>
          <BrandLogo />
          <span>{BRAND_LABELS[brand]}</span>
        </button>
      ))}
    </div>
  )
}

const PIPELINE = [
  { icon: 'variables' as IconName, title: 'Figma variables', body: 'Foundations, Semantics and Brand UI collections.' },
  { icon: 'extract' as IconName, title: 'npm run figma:pull', body: 'Snapshots variables, components and icons.' },
  { icon: 'json' as IconName, title: 'Generated tokens', body: 'CSS custom properties per brand mode.' },
  { icon: 'component' as IconName, title: 'Components & this site', body: 'Read only var(--bb-*), so they re-skin.' },
]

export function HomePage() {
  return (
    <SitePage current={PAGES.home}>
      {(brand, setBrand) => (
        <>
          <Hero />
          <Stats />
          <Section title="Style guide" description="The foundations every component is built from.">
            <div class="bbs-grid">
              {PILLARS.map((p) => (
                <PageLink key={p.to} to={p.to} class="bbs-card bbs-home-pillar">
                  <div class="bbs-home-pillar__preview">{p.preview}</div>
                  <div class="bbs-row"><span class="bbs-card__icon"><Icon name={p.icon} /></span><h3 class="bbs-card__title">{p.title}</h3></div>
                  <p class="bbs-card__desc">{p.description}</p>
                </PageLink>
              ))}
            </div>
          </Section>
          <Section title="Components" description="Atoms through screens, each with stories for every Figma variant.">
            <ComponentGroups />
          </Section>
          <Section title="Brands" description="Pick a brand to re-skin this whole site, the same way the plugin switches modes.">
            <BrandStrip current={brand} setBrand={setBrand} />
          </Section>
          <Section title="How it stays in sync" description="Change it in Figma, not in code.">
            <ol class="bbs-home-pipeline">
              {PIPELINE.map((step, i) => (
                <li key={step.title} class="bbs-card">
                  <span class="bbs-badge" data-tone="accent">Step {i + 1}</span>
                  <div class="bbs-row"><Icon name={step.icon} size="lg" /><h3 class="bbs-card__title">{step.title}</h3></div>
                  <p class="bbs-card__desc">{step.body}</p>
                </li>
              ))}
            </ol>
          </Section>
        </>
      )}
    </SitePage>
  )
}
