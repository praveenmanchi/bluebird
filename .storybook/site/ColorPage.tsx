import { BRANDS, BRAND_LABELS, type BrandId } from '../../src/shared/brand/generated/tokens'
import { BASE_VARS, COLOUR_ROLES, brandRamps, familyLabel, roleTokens, valueOf, withPrefix, type ColourRole } from './data'
import { contrastRatio, grade } from './contrast'
import { Badge, Section, SitePage, TokenName } from './Site'
import { PAGES } from './runtime'
import './color.css'

const CANVAS = '--bb-surface-canvas'

function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const ratio = contrastRatio(fg, bg)
  if (ratio === undefined) return null
  const g = grade(ratio)
  const tone = g === 'Fail' ? 'danger' : g === 'AA large' ? 'warning' : 'success'
  return <Badge tone={tone}>{ratio.toFixed(2)}:1 · {g}</Badge>
}

function RoleSwatch({ name, brand, role }: { name: string; brand: BrandId; role: ColourRole }) {
  const value = valueOf(name, brand)
  const isText = role.id === 'text' || role.id === 'icon'
  return (
    <div class="bbs-swatch">
      <div class="bbs-swatch__chip" style={{ background: isText ? `var(${CANVAS})` : `var(${name})` }}>
        {isText && <span style={{ color: `var(${name})` }}>Aa</span>}
      </div>
      <div class="bbs-swatch__meta">
        <TokenName name={name} />
        <span class="bbs-row bbs-small bbs-muted">
          <code>{value}</code>
          {isText && <ContrastBadge fg={value} bg={valueOf(CANVAS, brand)} />}
        </span>
      </div>
    </div>
  )
}

function SemanticRoles({ brand }: { brand: BrandId }) {
  return (
    <div class="bbs-stack">
      {COLOUR_ROLES.map((role) => (
        <div key={role.id} class="bbs-stack bbs-colour-role">
          <div>
            <h3 class="bbs-subhead">{role.label}</h3>
            <p class="bbs-small bbs-muted">{role.description}</p>
          </div>
          <div class="bbs-grid bbs-grid--tight">
            {roleTokens(role).map((name) => <RoleSwatch key={name} name={name} brand={brand} role={role} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Every tier 1 colour in every brand mode: the table design reviews start from. */
function AcrossBrands({ current }: { current: BrandId }) {
  const names = COLOUR_ROLES.flatMap(roleTokens)
  return (
    <div class="bbs-table-wrap">
      <table class="bbs-table">
        <thead>
          <tr>
            <th>Token</th>
            {BRANDS.map((b) => <th key={b} aria-current={b === current ? 'true' : undefined}>{BRAND_LABELS[b]}</th>)}
          </tr>
        </thead>
        <tbody>
          {names.map((name) => (
            <tr key={name}>
              <td><TokenName name={name} /></td>
              {BRANDS.map((b) => {
                const value = valueOf(name, b)
                return (
                  <td key={b}>
                    <span class="bbs-row bbs-small"><span class="bbs-chip-swatch" style={{ background: value }} /><code class="bbs-muted">{value}</code></span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ramps({ brand }: { brand: BrandId }) {
  return (
    <div class="bbs-stack">
      {brandRamps(brand).map((ramp) => (
        <div key={ramp.family} class="bbs-ramp">
          <h3 class="bbs-subhead">{familyLabel(ramp.family)}</h3>
          <div class="bbs-ramp__steps">
            {ramp.steps.map((step) => {
              const label = step.name.slice(`--bb-${brand}-color-${ramp.family}-`.length)
              const anchor = label.endsWith('-brand')
              return (
                <div key={step.name} class="bbs-ramp__step" title={step.name}>
                  <div class="bbs-ramp__chip" style={{ background: step.value }}>{anchor && <Badge tone="accent">Brand</Badge>}</div>
                  <TokenName name={step.name} label={label.replace(/-brand$/, '')} />
                  <code class="bbs-small bbs-muted">{step.value}</code>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function SharedPrimitives() {
  const shared = withPrefix(BASE_VARS, '--bb-color-')
  return (
    <div class="bbs-grid bbs-grid--tight">
      {shared.map((v) => (
        <div key={v.name} class="bbs-swatch">
          <div class="bbs-swatch__chip bbs-swatch__chip--checker"><span style={{ background: v.value }} /></div>
          <div class="bbs-swatch__meta">
            <TokenName name={v.name} />
            <code class="bbs-small bbs-muted">{v.value}</code>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ColorPage() {
  return (
    <SitePage
      current={PAGES.colour}
      eyebrow="Style guide"
      title="Colour"
      description="Components only ever read semantic tokens. Each brand mode points those roles at its own primitive palette, which is how one component library carries five brands."
    >
      {(brand) => (
        <>
          <Section title="Semantic colours" description={<>Brand UI tier 1 tokens for <strong>{BRAND_LABELS[brand]}</strong>. Text and icon colours show their contrast on <code>surface-canvas</code>. Click a token name to copy it.</>}>
            <SemanticRoles brand={brand} />
          </Section>
          <Section title="Across brands" description="The same semantic token in every brand mode. Use it to spot a role that drifts in one brand.">
            <AcrossBrands current={brand} />
          </Section>
          <Section title="Primitive palettes" description={<>Foundations for <strong>{BRAND_LABELS[brand]}</strong>. Steps marked Brand are the anchors the semantic tokens alias. Don't use primitives in components.</>}>
            <Ramps brand={brand} />
          </Section>
          <Section title="Shared primitives" description="Brand-neutral alpha overlays and the accessibility category colours.">
            <SharedPrimitives />
          </Section>
        </>
      )}
    </SitePage>
  )
}
