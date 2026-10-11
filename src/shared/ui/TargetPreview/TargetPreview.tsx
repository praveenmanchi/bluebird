import type { ComponentChildren, JSX } from 'preact'
import './TargetPreview.css'

export type TargetPreviewState = 'fail' | 'pass'

export interface TargetPreviewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'width' | 'height'> {
  /** Hit area of the target, in px. */
  width: number
  height: number
  /** Gap to the nearest other target, in px. Omit when it was not measured — no neighbour is drawn. */
  spacing?: number
  /** Size the target is measured against: 24 (2.5.8, AA) or 44 (2.5.5, AAA). */
  minimum?: number
  /** The dotted reference box. */
  enhanced?: number
  /** Figma "State". Derived from the numbers when omitted. */
  state?: TargetPreviewState
  /** Drawing scale. Figma draws at 200%. */
  zoom?: number
  /** Glyph inside the target. */
  glyph?: ComponentChildren
}

/** 2.5.8: big enough, or an undersized target whose 24px circle (centred on it) stays clear of
 *  the neighbour — approximated as gap + smallest side ≥ minimum, i.e. a same-sized neighbour. */
export function targetState({ width, height, spacing, minimum = 24 }: Pick<TargetPreviewProps, 'width' | 'height' | 'spacing' | 'minimum'>): TargetPreviewState {
  const smallest = Math.min(width, height)
  if (smallest >= minimum) return 'pass'
  return spacing !== undefined && spacing + smallest >= minimum ? 'pass' : 'fail'
}

/** Figma pins the gap marker 26px from the canvas top, above the 44px box at 200%. */
const GAP_MARKER_TOP = 26

const px = (n: number) => `${Math.round(n * 100) / 100}px`
const box = (size: number, cx: number, cy: number): JSX.CSSProperties => ({ width: px(size), height: px(size), left: px(cx - size / 2), top: px(cy - size / 2) })

/** Figma "Target Preview" (40000463:9175): the WCAG card's touch-target diagram — the hit area,
 *  the minimum box, the enhanced box and, when measured, the gap to the nearest target. */
export function TargetPreview({
  width, height, spacing, minimum = 24, enhanced = 44, state, zoom = 2, glyph = '✕', class: cls, ...rest
}: TargetPreviewProps) {
  const verdict = state ?? targetState({ width, height, spacing, minimum })
  const level = minimum >= 44 ? 'AAA' : 'AA'
  // Centre the target slightly left of middle so the neighbour has room on the right.
  const cx = 208, cy = 72
  const tw = width * zoom, th = height * zoom
  const neighbour = spacing !== undefined ? { left: cx + tw / 2 + spacing * zoom, size: Math.min(width, height) * zoom } : undefined
  return (
    <div {...rest} class={`bb-target-preview ${cls ?? ''}`} data-state={verdict}>
      <div class="bb-target-preview__canvas" role="img" aria-label={`Target ${width} by ${height} pixels${spacing !== undefined ? `, ${spacing} pixels from the nearest target` : ''}: ${verdict === 'pass' ? 'passes' : 'fails'} ${minimum} by ${minimum}`}>
        <span class="bb-target-preview__enhanced" style={box(enhanced * zoom, cx, cy)} />
        <span class="bb-target-preview__minimum" style={box(minimum * zoom, cx, cy)} />
        <span class="bb-target-preview__target" style={{ width: px(tw), height: px(th), left: px(cx - tw / 2), top: px(cy - th / 2) }}>{glyph}</span>
        <span class="bb-target-preview__circle" style={box(minimum * zoom, cx, cy)} />
        {neighbour && (
          <>
            <span class="bb-target-preview__neighbour" style={{ width: px(neighbour.size), height: px(neighbour.size), left: px(neighbour.left), top: px(cy - neighbour.size / 2) }}>i</span>
            <span class="bb-target-preview__gap" style={{ left: px(cx + tw / 2), top: px(GAP_MARKER_TOP), width: px(Math.max(1, spacing! * zoom)) }}>
              <span class="bb-target-preview__gap-label">{spacing}px gap</span>
            </span>
          </>
        )}
        <span class="bb-target-preview__size" style={{ left: px(cx - tw / 2), top: px(cy + (enhanced * zoom) / 2 + 2) }}>{width} × {height}</span>
        <span class="bb-target-preview__zoom">{Math.round(zoom * 100)}%</span>
      </div>
      <ul class="bb-target-preview__legend">
        <li><span class="bb-target-preview__key" data-key="target" />Hit area</li>
        <li><span class="bb-target-preview__key" data-key="minimum" />{minimum} × {minimum} minimum ({level})</li>
        {enhanced !== minimum && <li><span class="bb-target-preview__key" data-key="enhanced" />{enhanced} × {enhanced} enhanced (AAA)</li>}
      </ul>
    </div>
  )
}
