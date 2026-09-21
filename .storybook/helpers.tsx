// Shared story layouts. Kept outside src so the isolation lint never sees them.
import type { ComponentChildren } from 'preact'
import { BRANDS, BRAND_LABELS } from '../src/shared/brand/generated/tokens'

const label = { fontSize: 'var(--bb-font-size-caption)', color: 'var(--bb-card-variable-meta-fg)' }

/** Rows × columns grid that mirrors a Figma component-set frame. */
export function VariantGrid({ rows, columns, children }: { rows: string[]; columns: string[]; children: (row: string, column: string) => ComponentChildren }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `max-content repeat(${columns.length}, max-content)`, gap: 'var(--bb-space-stack-md) var(--bb-space-inline-lg)', alignItems: 'center' }}>
      <span />
      {columns.map((c) => <span key={c} style={label}>{c}</span>)}
      {rows.map((r) => [<span key={`${r}-label`} style={label}>{r}</span>, ...columns.map((c) => <div key={`${r}-${c}`}>{children(r, c)}</div>)])}
    </div>
  )
}

/** The same children rendered once per brand, like the Figma "across brands" sections. */
export function BrandGrid({ children, width = '160px' }: { children: ComponentChildren; width?: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--bb-space-stack-md)' }}>
      {BRANDS.map((brand) => (
        <div key={brand} data-brand={brand} style={{ width, padding: 'var(--bb-card-variable-padding)', borderRadius: 'var(--bb-card-variable-radius)', background: 'var(--bb-card-variable-bg-default)', color: 'var(--bb-card-variable-title-fg)', border: 'var(--bb-border-width-default) solid var(--bb-card-variable-border-default)', display: 'flex', flexDirection: 'column', gap: 'var(--bb-space-stack-sm)' }}>
          <strong style={{ fontSize: 'var(--bb-card-variable-title-font-size)', fontWeight: 'var(--bb-card-variable-title-font-weight)' }}>{BRAND_LABELS[brand]}</strong>
          {children}
        </div>
      ))}
    </div>
  )
}
