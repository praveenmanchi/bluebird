// Page chrome for the style-guide site: header, style-guide sub-navigation and
// the small building blocks every page shares.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { BrandLogo } from '../../src/shared/ui/BrandLogo/BrandLogo'
import { BRAND_LABELS, FIGMA_FILE_KEY, type BrandId } from '../../src/shared/brand/generated/tokens'
import { COMPONENT_GROUPS, PAGES, go, hrefFor, useBrand, useStoryIndex, type PageId } from './runtime'
import './site.css'

const STYLE_GUIDE: { id: PageId; label: string }[] = [
  { id: PAGES.colour, label: 'Colour' },
  { id: PAGES.typography, label: 'Typography' },
  { id: PAGES.iconography, label: 'Iconography' },
  { id: PAGES.spacing, label: 'Spacing & shape' },
  { id: PAGES.brands, label: 'Brands' },
  { id: PAGES.tokens, label: 'Token reference' },
]
const STYLE_GUIDE_IDS = new Set<string>(STYLE_GUIDE.map((p) => p.id))

interface PageLinkProps { to: string; class?: string; children: ComponentChildren; current?: boolean }

/** Anchor that navigates inside Storybook but still works with cmd-click / copy link. */
export function PageLink({ to, class: cls, children, current }: PageLinkProps) {
  return (
    <a class={cls} href={hrefFor(to)} target="_top" aria-current={current ? 'page' : undefined} onClick={(e) => go(to, e)}>
      {children}
    </a>
  )
}

/** First component story, used by the "Workshop" link to drop into the classic Storybook view. */
function useWorkshopTarget(): string {
  const index = useStoryIndex()
  if (index.status !== 'ready') return PAGES.components
  const first = index.entries.find((e) => e.type === 'story' && e.title.startsWith(`${COMPONENT_GROUPS[0]}/`))
  return first?.id ?? PAGES.components
}

/** The Figma icon set has no house glyph, so the site header draws its own (24px grid, currentColor). */
function HomeIcon() {
  return (
    <svg class="bbs-header__home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10.5h4.5v-6h4v6h4.5V9" />
    </svg>
  )
}

function SiteHeader({ current }: { current: PageId }) {
  const workshop = useWorkshopTarget()
  const inStyleGuide = STYLE_GUIDE_IDS.has(current)
  return (
    <header class="bbs-header">
      <div class="bbs-header__inner">
        <PageLink to={PAGES.home} class="bbs-header__home">
          <span class="bbs-header__logo"><BrandLogo /></span>
          <span class="bbs-header__product">Design System</span>
        </PageLink>
        <nav class="bbs-header__nav" aria-label="Site">
          <PageLink to={PAGES.home} class="bbs-header__icon-link" current={current === PAGES.home}>
            <HomeIcon />
            <span class="bbs-visually-hidden">Home</span>
          </PageLink>
          <PageLink to={PAGES.colour} current={inStyleGuide}>Style guide</PageLink>
          <PageLink to={PAGES.components} current={current === PAGES.components}>Components</PageLink>
          <PageLink to={workshop}>Storybook</PageLink>
        </nav>
      </div>
      {inStyleGuide && (
        <nav class="bbs-subnav" aria-label="Style guide">
          <div class="bbs-subnav__inner">
            {STYLE_GUIDE.map((p) => <PageLink key={p.id} to={p.id} current={p.id === current}>{p.label}</PageLink>)}
          </div>
        </nav>
      )}
    </header>
  )
}

interface SitePageProps {
  current: PageId
  eyebrow?: string
  title?: string
  description?: ComponentChildren
  /** Render-prop so pages can read and change the active brand. */
  children: (brand: BrandId, setBrand: (brand: BrandId) => void) => ComponentChildren
}

/** Full-bleed page: header, optional intro, content, footer. Everything inside follows the brand. */
export function SitePage({ current, eyebrow, title, description, children }: SitePageProps) {
  const [brand, setBrand] = useBrand()
  return (
    <div class="bbs-page" data-brand={brand}>
      <SiteHeader current={current} />
      <main class="bbs-main">
        {title && (
          <div class="bbs-intro">
            {eyebrow && <p class="bbs-eyebrow">{eyebrow}</p>}
            <h1 class="bbs-title">{title}</h1>
            {description && <p class="bbs-lede">{description}</p>}
          </div>
        )}
        {children(brand, setBrand)}
      </main>
      <footer class="bbs-footer">
        <span>Generated from Figma variables · {BRAND_LABELS[brand]} mode</span>
        <a href={`https://www.figma.com/design/${FIGMA_FILE_KEY}`} target="_blank" rel="noreferrer">Open the Figma file ↗</a>
      </footer>
    </div>
  )
}

export function Section({ title, description, children, id }: { title: string; description?: ComponentChildren; children: ComponentChildren; id?: string }) {
  return (
    <section class="bbs-section" id={id}>
      <header class="bbs-section__head">
        <h2 class="bbs-section__title">{title}</h2>
        {description && <p class="bbs-section__desc">{description}</p>}
      </header>
      {children}
    </section>
  )
}

/** Token name chip; click copies `var(--name)`. */
export function TokenName({ name, label }: { name: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`var(${name})`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false) // clipboard blocked (insecure origin or iframe policy); the name is still selectable
    }
  }
  return (
    <button type="button" class="bbs-token" onClick={copy} title={`Copy var(${name})`}>
      {copied ? 'Copied' : (label ?? name.replace(/^--bb-/, ''))}
    </button>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ComponentChildren; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  return <span class="bbs-badge" data-tone={tone}>{children}</span>
}
