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
  /** Hover text with the detail behind the status. */
  title?: string
}

/** The four "Buttom Status" instances Figma toggles with Git / UXAI / MCP / Dual File. */
export const FOOTER_DEFAULT_PILLS = {
  git: { label: 'Git', status: 'good' },
  uxai: { label: 'UXAI', status: 'good' },
  mcp: { label: 'MCP', status: 'good' },
  dualFile: { label: 'Dual File', status: 'good' },
} as const satisfies Record<string, FooterPill>

export interface FooterProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'size'> {
  /** Figma BOOLEAN "Git": shows the first "Buttom Status" pill. */
  git?: boolean
  /** Figma BOOLEAN "UXAI": shows the second pill. */
  uxai?: boolean
  /** Figma BOOLEAN "MCP": shows the third pill. */
  mcp?: boolean
  /** Figma BOOLEAN "Dual File": shows the fourth (fill-width) pill. */
  dualFile?: boolean
  /** Explicit pill list; when set it replaces the four booleans. */
  pills?: readonly FooterPill[]
  /** Live label / status for a default pill (e.g. the Dual File connection), keeping the booleans' show / hide. */
  statuses?: Partial<Record<keyof typeof FOOTER_DEFAULT_PILLS, FooterPill>>
  /** Segments of the "info" instance ("20m" | "V2.11.0"). */
  meta?: ComponentChildren[]
  /** Active step of the "size expander" instance. */
  size?: SizeExpanderValue
  onSizeChange?: (size: SizeExpanderValue) => void
  /** The Minimize button (minimize-corners glyph): shrinks the plugin to its launcher. */
  onMinimize?: () => void
  /** Pointer drag on the grip, reported as the total offset from the drag start. */
  onResizeDrag?: (delta: { dx: number; dy: number }, phase: 'move' | 'end') => void
  /** Accessible name of the Minimize button. */
  minimizeLabel?: string
  /** False hides the size steps, Minimize and grip (Dev Mode, where the plugin fills the Inspect panel). */
  resizable?: boolean
  /** The info button (Figma "Footer Info", 40002953:8551): replays the current tab's intro. Omit to hide it. */
  onHelp?: () => void
  /** Figma "Footer Info" State=Active: the intro is open. */
  helpActive?: boolean
  /** Accessible name of the info button. */
  helpLabel?: string
}

function resolvePills({ git = true, uxai = true, mcp = true, dualFile = true, pills, statuses }: FooterProps): readonly FooterPill[] {
  if (pills) return pills
  const flags = { git, uxai, mcp, dualFile }
  return (Object.keys(FOOTER_DEFAULT_PILLS) as (keyof typeof FOOTER_DEFAULT_PILLS)[]).filter((k) => flags[k]).map((k) => statuses?.[k] ?? FOOTER_DEFAULT_PILLS[k])
}

/** Figma "footer" (133:1675): status pills and an info meta line left; one right-aligned row (8px apart) of the info button, the size expander, Minimize and the resize grip. */
export function Footer(props: FooterProps) {
  const { git: _g, uxai: _u, mcp: _m, dualFile: _d, pills: _p, statuses: _s, meta = ['20m', 'V2.11.0'], size, onSizeChange, onMinimize, onResizeDrag, minimizeLabel = 'Minimize', resizable = true, onHelp, helpActive = false, helpLabel = 'Show tab intro', class: cls, ...rest } = props

  const startDrag = (e: PointerEvent) => {
    if (!onResizeDrag) return
    const target = e.currentTarget as HTMLElement
    const origin = { x: e.clientX, y: e.clientY }
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => onResizeDrag({ dx: ev.clientX - origin.x, dy: ev.clientY - origin.y }, 'move')
    const end = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
      onResizeDrag({ dx: ev.clientX - origin.x, dy: ev.clientY - origin.y }, 'end')
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
    e.preventDefault()
  }
  const visible = resolvePills(props)
  return (
    <footer {...rest} class={`bb-footer ${cls ?? ''}`}>
      <div class="bb-footer__status">
        {visible.map((pill, i) => (
          <span key={i} class="bb-footer__segment" data-last={i === visible.length - 1 || undefined}>
            <StatusPill status={pill.status} title={pill.title} class="bb-footer__pill">{pill.label}</StatusPill>
            {i < visible.length - 1 && <span class="bb-footer__divider" aria-hidden="true" />}
          </span>
        ))}
      </div>
      <InfoMeta items={meta} class="bb-footer__meta" />
      {(resizable || onHelp) && <div class="bb-footer__controls">
        {onHelp && (
          <button type="button" class="bb-footer__help" aria-label={helpLabel} title={helpLabel} aria-pressed={helpActive} data-active={helpActive || undefined} onClick={onHelp}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" class="bb-footer__help-ring" /><rect x="7.375" y="7" width="1.25" height="4.25" rx="0.625" /><circle cx="8" cy="5.1" r="0.8" /></svg>
          </button>
        )}
        {resizable && <>
          <SizeExpander value={size} onChange={onSizeChange} class="bb-footer__size" />
          <button type="button" class="bb-footer__minimize" aria-label={minimizeLabel} title={minimizeLabel} onClick={onMinimize}>
            <Icon name="ui-sidebar-minimize-corners" />
          </button>
          <span class="bb-footer__grip" role={onResizeDrag ? 'separator' : undefined} aria-label={onResizeDrag ? 'Resize' : undefined} aria-hidden={onResizeDrag ? undefined : 'true'} data-draggable={onResizeDrag ? '' : undefined} onPointerDown={startDrag}><Icon name="footer-grip" /></span>
        </>}
      </div>}
    </footer>
  )
}
