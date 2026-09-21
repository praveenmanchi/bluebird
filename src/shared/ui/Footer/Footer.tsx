import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import { InfoMeta } from '../InfoMeta/InfoMeta'
import { SizeExpander, type SizeExpanderValue } from '../SizeExpander/SizeExpander'
import { StatusPill, type StatusPillStatus } from '../StatusPill/StatusPill'
import './Footer.css'

export interface FooterPill {
  /** Text of the "Buttom Status" instance (its Figma "Status" TEXT property). */
  label: ComponentChildren
  /** Which status glyph leads the pill. */
  status?: StatusPillStatus
}

/** The four "Buttom Status" instances Figma toggles with Local / UXAI / MCP / Dual File. */
export const FOOTER_DEFAULT_PILLS = {
  local: { label: 'Local', status: 'good' },
  uxai: { label: 'UX AI', status: 'good' },
  mcp: { label: 'MCP', status: 'good' },
  dualFile: { label: 'Dual File', status: 'good' },
} as const satisfies Record<string, FooterPill>

export interface FooterProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'size'> {
  /** Figma BOOLEAN "Local": shows the first "Buttom Status" pill. */
  local?: boolean
  /** Figma BOOLEAN "UXAI": shows the second pill. */
  uxai?: boolean
  /** Figma BOOLEAN "MCP": shows the third pill. */
  mcp?: boolean
  /** Figma BOOLEAN "Dual File": shows the fourth (fill-width) pill. */
  dualFile?: boolean
  /** Explicit pill list; when set it replaces the four booleans. */
  pills?: readonly FooterPill[]
  /** Segments of the "info" instance ("20m" | "V2.11.0"). */
  meta?: ComponentChildren[]
  /** Active step of the "size expander" instance. */
  size?: SizeExpanderValue
  onSizeChange?: (size: SizeExpanderValue) => void
  /** Click on the footer-chevron glyph (expand / collapse the panel). */
  onExpand?: () => void
  /** Accessible name of the chevron button. */
  expandLabel?: string
}

function resolvePills({ local = true, uxai = true, mcp = true, dualFile = true, pills }: FooterProps): readonly FooterPill[] {
  if (pills) return pills
  const flags = { local, uxai, mcp, dualFile }
  return (Object.keys(FOOTER_DEFAULT_PILLS) as (keyof typeof FOOTER_DEFAULT_PILLS)[]).filter((k) => flags[k]).map((k) => FOOTER_DEFAULT_PILLS[k])
}

/** Figma "footer" (133:1675): status pills, an info meta line, the size expander, an expand chevron and a resize grip. */
export function Footer(props: FooterProps) {
  const { local: _l, uxai: _u, mcp: _m, dualFile: _d, pills: _p, meta = ['20m', 'V2.11.0'], size, onSizeChange, onExpand, expandLabel = 'Expand', class: cls, ...rest } = props
  const visible = resolvePills(props)
  return (
    <footer {...rest} class={`bb-footer ${cls ?? ''}`}>
      <div class="bb-footer__status">
        {visible.map((pill, i) => (
          <span key={i} class="bb-footer__segment" data-last={i === visible.length - 1 || undefined}>
            <StatusPill status={pill.status} class="bb-footer__pill">{pill.label}</StatusPill>
            {i < visible.length - 1 && <span class="bb-footer__divider" aria-hidden="true" />}
          </span>
        ))}
      </div>
      <InfoMeta items={meta} class="bb-footer__meta" />
      <div class="bb-footer__controls">
        <div class="bb-footer__size-group">
          <SizeExpander value={size} onChange={onSizeChange} class="bb-footer__size" />
          <button type="button" class="bb-footer__expand" aria-label={expandLabel} onClick={onExpand}>
            <Icon name="footer-chevron" />
          </button>
        </div>
        <span class="bb-footer__grip" aria-hidden="true"><Icon name="footer-grip" /></span>
      </div>
    </footer>
  )
}
