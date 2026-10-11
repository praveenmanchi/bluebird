import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BRANDS, BRAND_LABELS, COMPONENT_TOKENS, TOKEN_NAMES } from '../generated/tokens'

const meta = { title: 'Style guide/Token reference' } satisfies Meta
export default meta
type Story = StoryObj

const cell = { padding: 'var(--bb-space-inset-sm) var(--bb-space-inset-md)', borderBottom: 'var(--bb-border-width-default) solid var(--bb-card-variable-border-default)', fontSize: 'var(--bb-font-size-caption)', textAlign: 'left' as const, verticalAlign: 'middle' }

function Swatch({ name }: { name: string }) {
  return <span style={{ display: 'inline-block', width: 'var(--bb-icon-size-sm)', height: 'var(--bb-icon-size-sm)', borderRadius: 'var(--bb-radius-sm)', background: `var(${name})`, border: 'var(--bb-border-width-default) solid var(--bb-card-variable-border-default)', verticalAlign: 'middle', marginRight: 'var(--bb-space-inline-sm)' }} />
}

function Value({ name }: { name: string }) {
  return <code style={{ fontSize: 'var(--bb-font-size-caption)' }}>{typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(name).trim()}</code>
}

/** Every generated token, resolved for the brand picked in the toolbar. */
export const AllTokens: Story = {
  render: () => (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead><tr><th style={cell}>Token</th><th style={cell}>Value</th></tr></thead>
      <tbody>
        {TOKEN_NAMES.map((name) => (
          <tr key={name}>
            <td style={cell}><code>{name}</code></td>
            <td style={cell}>{/color|bg|fg|border(?!-width)|fill|divider|indicator|glyph/.test(name) && <Swatch name={name} />}<Value name={name} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}

/** Which Figma variables each component set binds (drives `npm run tokens:check`). */
export const ComponentBindings: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--bb-space-stack-md)' }}>
      {Object.entries(COMPONENT_TOKENS).map(([component, tokens]) => (
        <section key={component}>
          <h3 style={{ margin: 0, fontSize: 'var(--bb-font-size-label)' }}>{component} <small style={{ color: 'var(--bb-card-variable-meta-fg)' }}>{tokens.length} tokens</small></h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--bb-space-inline-lg)', columns: 2 }}>{tokens.map((t) => <li key={t} style={{ fontSize: 'var(--bb-font-size-caption)' }}><code>{t}</code></li>)}</ul>
        </section>
      ))}
    </div>
  ),
}

/** The five Brand modes side by side. */
export const Brands: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--bb-space-stack-md)', flexWrap: 'wrap' }}>
      {BRANDS.map((brand) => (
        <div key={brand} data-brand={brand} style={{ width: '160px', padding: 'var(--bb-card-variable-padding)', background: 'var(--bb-card-variable-bg-default)', color: 'var(--bb-card-variable-title-fg)', border: 'var(--bb-border-width-default) solid var(--bb-card-variable-border-default)', borderRadius: 'var(--bb-card-variable-radius)' }}>
          <strong>{BRAND_LABELS[brand]}</strong>
          <div style={{ display: 'flex', gap: 'var(--bb-space-inline-xs)', marginTop: 'var(--bb-space-stack-sm)' }}>
            {['--bb-button-primary-bg-default', '--bb-tab-indicator-color', '--bb-app-header-bg-default', '--bb-menu-item-bg-selected', '--bb-feedback-success'].map((n) => <Swatch key={n} name={n} />)}
          </div>
        </div>
      ))}
    </div>
  ),
}
