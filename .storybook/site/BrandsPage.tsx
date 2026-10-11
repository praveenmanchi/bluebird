import { BrandLogo } from '../../src/shared/ui/BrandLogo/BrandLogo'
import { Button } from '../../src/shared/ui/Button/Button'
import { BRANDS, BRAND_LABELS, type BrandId } from '../../src/shared/brand/generated/tokens'
import { brandRamps, fontName, valueOf } from './data'
import { Badge, Section, SitePage, TokenName } from './Site'
import { PAGES } from './runtime'
import './brands.css'

const KEY_ROLES = ['--bb-surface-canvas', '--bb-surface-raised', '--bb-surface-accent', '--bb-text-primary', '--bb-text-accent', '--bb-border-focus']

function BrandCard({ brand, current, onSelect }: { brand: BrandId; current: boolean; onSelect: (b: BrandId) => void }) {
  const anchors = brandRamps(brand).find((r) => r.family === 'brand')?.steps ?? []
  return (
    <article class="bbs-brand-card" data-brand={brand} data-current={current || undefined}>
      <header class="bbs-brand-card__banner"><BrandLogo /></header>
      <div class="bbs-brand-card__body">
        <div class="bbs-row bbs-brand-card__title">
          <h3 class="bbs-card__title">{BRAND_LABELS[brand]}</h3>
          {current ? <Badge tone="accent">Previewing</Badge> : <button type="button" class="bbs-link" onClick={() => onSelect(brand)}>Preview site</button>}
        </div>
        <dl class="bbs-brand-card__facts">
          <div><dt>UI font</dt><dd>{fontName(valueOf('--bb-font-family-ui', brand))}</dd></div>
          <div><dt>Display font</dt><dd style={{ fontFamily: 'var(--bb-font-family-display)' }}>{fontName(valueOf('--bb-font-family-display', brand))}</dd></div>
        </dl>
        <div>
          <p class="bbs-small bbs-muted bbs-brand-card__label">Brand anchors</p>
          <div class="bbs-brand-card__anchors">
            {anchors.map((a) => <span key={a.name} title={`${a.name} ${a.value}`} style={{ background: a.value }} />)}
          </div>
        </div>
        <div>
          <p class="bbs-small bbs-muted bbs-brand-card__label">Semantic roles</p>
          <ul class="bbs-brand-card__roles">
            {KEY_ROLES.map((role) => (
              <li key={role}><span class="bbs-chip-swatch" style={{ background: `var(${role})` }} /><TokenName name={role} /></li>
            ))}
          </ul>
        </div>
        <div class="bbs-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      </div>
    </article>
  )
}

export function BrandsPage() {
  return (
    <SitePage
      current={PAGES.brands}
      eyebrow="Style guide"
      title="Brands"
      description="Every brand is a mode of the Brand UI collection. Components stay the same; the mode swaps their colours, families and a handful of sizes. Each card below is rendered in its own mode with real components."
    >
      {(brand, setBrand) => (
        <Section title={`${BRANDS.length} brand modes`} description="Adding a brand takes a Foundations namespace and a Brand UI mode in Figma. Then pull and regenerate.">
          <div class="bbs-brand-grid">
            {BRANDS.map((b) => <BrandCard key={b} brand={b} current={b === brand} onSelect={setBrand} />)}
          </div>
        </Section>
      )}
    </SitePage>
  )
}
