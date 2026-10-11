import { BRANDS, BRAND_LABELS, type BrandId } from '../../src/shared/brand/generated/tokens'
import { BASE_VARS, fontName, stepLabel, valueOf, withPrefix } from './data'
import { Section, SitePage, TokenName } from './Site'
import { PAGES } from './runtime'
import './typography.css'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789'
const SAMPLE = 'Review contrast across every brand mode.'

interface FamilyRole { token: string; label: string; usage: string }

function familyRoles(brand: BrandId): FamilyRole[] {
  return [
    { token: '--bb-font-family-ui', label: 'UI', usage: 'Every control, label and body string.' },
    { token: '--bb-font-family-display', label: 'Display', usage: 'Headings and the banner wordmark.' },
    { token: '--bb-font-family-brand', label: 'Brand', usage: 'Brand expressions such as the team banner.' },
    { token: `--bb-${brand}-type-family-mono`, label: 'Mono', usage: 'Code, token names and values (primitive).' },
  ]
}

function Families({ brand }: { brand: BrandId }) {
  return (
    <div class="bbs-grid">
      {familyRoles(brand).map((role) => {
        const family = fontName(valueOf(role.token, brand))
        return (
          <article key={role.label} class="bbs-card bbs-font-card">
            <div class="bbs-row"><span class="bbs-badge" data-tone="accent">{role.label}</span><TokenName name={role.token} /></div>
            <div class="bbs-font-card__aa" style={{ fontFamily: `"${family}", sans-serif` }}>Aa</div>
            <h3 class="bbs-card__title">{family}</h3>
            <p class="bbs-font-card__alphabet" style={{ fontFamily: `"${family}", sans-serif` }}>{ALPHABET}</p>
            <p class="bbs-card__desc">{role.usage}</p>
          </article>
        )
      })}
    </div>
  )
}

/** Semantic type styles: a size token paired with the line-height token of the same name. */
function Scale({ brand }: { brand: BrandId }) {
  const sizes = withPrefix(BASE_VARS, '--bb-font-size-')
  const ordered = [...sizes].sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
  return (
    <div class="bbs-table-wrap">
      <table class="bbs-table bbs-type-table">
        <thead><tr><th>Style</th><th>Sample</th><th>Size</th><th>Line height</th></tr></thead>
        <tbody>
          {ordered.map((size) => {
            const style = stepLabel(size.name, '--bb-font-size')
            const lineToken = `--bb-font-line-${style}`
            const line = valueOf(lineToken, brand)
            return (
              <tr key={size.name}>
                <td><strong>{style}</strong></td>
                <td>
                  <span class="bbs-type-sample" style={{ fontSize: `var(${size.name})`, lineHeight: line ? `var(${lineToken})` : 'normal' }}>{SAMPLE}</span>
                </td>
                <td><TokenName name={size.name} /> <code class="bbs-small bbs-muted">{size.value}</code></td>
                <td>{line ? <><TokenName name={lineToken} /> <code class="bbs-small bbs-muted">{line}</code></> : <span class="bbs-muted">normal</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Weights() {
  return (
    <div class="bbs-grid bbs-grid--tight">
      {withPrefix(BASE_VARS, '--bb-font-weight-').map((w) => (
        <div key={w.name} class="bbs-card">
          <span class="bbs-weight-sample" style={{ fontWeight: `var(${w.name})` }}>Bluebird</span>
          <TokenName name={w.name} />
          <code class="bbs-small bbs-muted">{w.value}</code>
        </div>
      ))}
    </div>
  )
}

function Primitives() {
  const groups = [
    { prefix: '--bb-type-size', label: 'Size' },
    { prefix: '--bb-type-line', label: 'Line height' },
    { prefix: '--bb-type-weight', label: 'Weight' },
    { prefix: '--bb-type-tracking', label: 'Tracking' },
  ]
  return (
    <div class="bbs-grid">
      {groups.map((g) => (
        <div key={g.prefix} class="bbs-card">
          <h3 class="bbs-card__title">{g.label}</h3>
          <ul class="bbs-primitive-list">
            {withPrefix(BASE_VARS, `${g.prefix}-`).map((v) => (
              <li key={v.name}><TokenName name={v.name} label={stepLabel(v.name, g.prefix)} /><code class="bbs-small bbs-muted">{v.value}</code></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function FamiliesAcrossBrands() {
  return (
    <div class="bbs-table-wrap">
      <table class="bbs-table">
        <thead><tr><th>Brand</th><th>UI</th><th>Display</th><th>Brand</th></tr></thead>
        <tbody>
          {BRANDS.map((b) => (
            <tr key={b}>
              <td><strong>{BRAND_LABELS[b]}</strong></td>
              {['ui', 'display', 'brand'].map((role) => {
                const family = fontName(valueOf(`--bb-font-family-${role}`, b))
                return <td key={role} style={{ fontFamily: `"${family}", sans-serif` }}>{family}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TypographyPage() {
  return (
    <SitePage
      current={PAGES.typography}
      eyebrow="Style guide"
      title="Typography"
      description="Each brand chooses its families. The semantic scale is shared, so layouts hold their rhythm in every brand."
    >
      {(brand) => (
        <>
          <Section title="Font families" description={<>Families for <strong>{BRAND_LABELS[brand]}</strong>, read from Brand UI tier 1.</>}>
            <Families brand={brand} />
          </Section>
          <Section title="Families across brands"><FamiliesAcrossBrands /></Section>
          <Section title="Type scale" description="Semantic size and line-height tokens. Components read these, never raw pixel sizes.">
            <Scale brand={brand} />
          </Section>
          <Section title="Weights"><Weights /></Section>
          <Section title="Primitive scale" description="Foundations that the semantic styles alias.">
            <Primitives />
          </Section>
        </>
      )}
    </SitePage>
  )
}
