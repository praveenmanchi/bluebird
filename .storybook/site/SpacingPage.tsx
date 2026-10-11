import { BASE_VARS, stepLabel, withPrefix, type TokenVar } from './data'
import { Section, SitePage, TokenName } from './Site'
import { PAGES } from './runtime'
import './spacing.css'

const SPACING = [
  { prefix: '--bb-space-inset', label: 'Inset', usage: 'Padding inside a container, on every side.' },
  { prefix: '--bb-space-inline', label: 'Inline', usage: 'Horizontal gaps between siblings in a row.' },
  { prefix: '--bb-space-stack', label: 'Stack', usage: 'Vertical gaps between stacked elements.' },
]

const byValue = (vars: TokenVar[]) => [...vars].sort((a, b) => parseFloat(a.value) - parseFloat(b.value))

function SpacingScale({ prefix }: { prefix: string }) {
  return (
    <ul class="bbs-space-list">
      {byValue(withPrefix(BASE_VARS, `${prefix}-`)).map((v) => (
        <li key={v.name}>
          <TokenName name={v.name} label={stepLabel(v.name, prefix)} />
          <span class="bbs-space-bar" style={{ width: `calc(var(${v.name}) * 4)` }} />
          <code class="bbs-small bbs-muted">{v.value}</code>
        </li>
      ))}
    </ul>
  )
}

function Radii() {
  return (
    <div class="bbs-grid bbs-grid--tight">
      {byValue(withPrefix(BASE_VARS, '--bb-radius-')).map((v) => (
        <div key={v.name} class="bbs-card bbs-shape-card">
          <span class="bbs-radius-sample" style={{ borderRadius: `var(${v.name})` }} />
          <TokenName name={v.name} />
          <code class="bbs-small bbs-muted">{v.value}</code>
        </div>
      ))}
    </div>
  )
}

function Strokes() {
  return (
    <div class="bbs-grid bbs-grid--tight">
      {withPrefix(BASE_VARS, '--bb-border-width-').map((v) => (
        <div key={v.name} class="bbs-card bbs-shape-card">
          <span class="bbs-stroke-sample" style={{ borderWidth: `var(${v.name})` }} />
          <TokenName name={v.name} />
          <code class="bbs-small bbs-muted">{v.value}</code>
        </div>
      ))}
    </div>
  )
}

function Sizes() {
  return (
    <div class="bbs-table-wrap">
      <table class="bbs-table">
        <thead><tr><th>Token</th><th>Value</th><th>Preview</th></tr></thead>
        <tbody>
          {byValue(withPrefix(BASE_VARS, '--bb-size-')).map((v) => (
            <tr key={v.name}>
              <td><TokenName name={v.name} /></td>
              <td><code class="bbs-small bbs-muted">{v.value}</code></td>
              <td><span class="bbs-size-sample" style={{ width: `var(${v.name})`, height: `min(var(${v.name}), var(--bb-size-control-height-lg))` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Primitives() {
  const groups = [
    { prefix: '--bb-dimension-space', label: 'Space' },
    { prefix: '--bb-dimension-radius', label: 'Radius' },
    { prefix: '--bb-dimension-stroke', label: 'Stroke' },
    { prefix: '--bb-dimension-size', label: 'Size' },
  ]
  return (
    <div class="bbs-grid">
      {groups.map((g) => (
        <div key={g.prefix} class="bbs-card">
          <h3 class="bbs-card__title">{g.label}</h3>
          <ul class="bbs-primitive-list">
            {byValue(withPrefix(BASE_VARS, `${g.prefix}-`)).map((v) => (
              <li key={v.name}><TokenName name={v.name} label={stepLabel(v.name, g.prefix)} /><code class="bbs-small bbs-muted">{v.value}</code></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function SpacingPage() {
  return (
    <SitePage
      current={PAGES.spacing}
      eyebrow="Style guide"
      title="Spacing & shape"
      description="The plugin runs in a small Figma panel, so the scale is dense and deliberate. These Semantics tokens are shared by every brand. A few component tokens override them per brand."
    >
      {() => (
        <>
          <Section title="Spacing" description="Bars are drawn at 4× so the small steps are easy to compare.">
            <div class="bbs-grid">
              {SPACING.map((s) => (
                <div key={s.prefix} class="bbs-card">
                  <h3 class="bbs-card__title">{s.label}</h3>
                  <p class="bbs-card__desc">{s.usage}</p>
                  <SpacingScale prefix={s.prefix} />
                </div>
              ))}
            </div>
          </Section>
          <Section title="Radius"><Radii /></Section>
          <Section title="Stroke"><Strokes /></Section>
          <Section title="Sizes" description="Fixed sizes for icons, controls and chrome."><Sizes /></Section>
          <Section title="Primitive dimensions" description="Foundations that the semantic tokens alias."><Primitives /></Section>
        </>
      )}
    </SitePage>
  )
}
