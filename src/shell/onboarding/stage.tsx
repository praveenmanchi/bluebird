// Scene engine for the tour's demo panel. Mirrors the Figma Motion keyframes on the
// "Video · <step>" frames: every entrance is a CSS animation delayed to its moment on a
// shared clock, state changes are two stacked layers that cross-fade, and a cursor
// walks to measured targets. The resting (non-animated) styles are the scene's end
// state, so `still` (stories, prefers-reduced-motion) just switches the animations off.
import type { ComponentChildren, JSX, RefObject } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'

/** One scene run; matches the 6 s Figma timelines. */
export const SCENE_MS = 6000
/** Pause before the demo replays, so it reads like a looping video. */
export const SCENE_REST_MS = 1500
/** Cursor travel time into each stop (the Figma path eases over 0.6 s). */
const CURSOR_TRAVEL_MS = 600

export type RevealKind = 'up' | 'down' | 'left' | 'right' | 'pop' | 'bounce' | 'fade'
export type FxKind = 'pulse' | 'wiggle' | 'dim' | 'float' | 'spin'

type Style = JSX.CSSProperties & Record<`--${string}`, string>

/** Class + inline delay for an entrance at `delay` ms on the scene clock; `base` keeps the element's own class. */
export function reveal(delay: number, kind: RevealKind = 'up', base?: string): { class: string; style: Style } {
  return { class: `${base ? `${base} ` : ''}bb-ob-rv bb-ob-rv--${kind}`, style: { '--ob-d': `${delay}ms` } }
}

/** Wraps a child in a one-off effect (pulse, wiggle…) starting at `at` ms; no `at` = no effect. */
export function Fx({ kind, at, children, class: cls }: { kind: FxKind; at?: number; children: ComponentChildren; class?: string }) {
  if (at === undefined) return <>{children}</>
  return <div class={`bb-ob-fx bb-ob-fx--${kind}${cls ? ` ${cls}` : ''}`} style={{ '--ob-fx': `${at}ms` } as Style}>{children}</div>
}

export interface SwapProps {
  /** Entrance of the first state. */
  enter: number
  /** Moment the second state replaces the first. */
  at: number
  before: ComponentChildren
  after: ComponentChildren
  kind?: RevealKind
  class?: string
}

/** Two states in one grid cell: `before` enters, then cross-fades to `after` (the Figma overlay pairs). */
export function Swap({ enter, at, before, after, kind = 'up', class: cls }: SwapProps) {
  const style = { '--ob-d': `${enter}ms`, '--ob-swap': `${at}ms` } as Style
  return (
    <div class={`bb-ob-swap bb-ob-rv bb-ob-rv--${kind}${cls ? ` ${cls}` : ''}`} style={style}>
      <div class="bb-ob-swap__before" aria-hidden="true">{before}</div>
      <div class="bb-ob-swap__after">{after}</div>
    </div>
  )
}

export interface CursorStop {
  /** Arrival time in ms. */
  at: number
  target: RefObject<HTMLElement>
  /** Point inside the target, as a share of its width / height (default centre). */
  fx?: number
  fy?: number
  click?: boolean
}

interface Point { x: number; y: number }
interface Placed { at: number; click: boolean; point: Point }

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const motionQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => motionQuery()?.matches ?? false)
  useEffect(() => {
    const query = motionQuery()
    if (!query) return undefined
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Offset of `el` inside `box` from the offset chain, which ignores transforms — the targets'
 * ancestors are still in their entrance "from" pose (shifted / scaled) when this runs.
 */
export function pointIn(box: HTMLElement, el: HTMLElement, fx: number, fy: number): Point {
  let x = el.offsetWidth * fx
  let y = el.offsetHeight * fy
  let node: HTMLElement | null = el
  while (node && node !== box) {
    x += node.offsetLeft
    y += node.offsetTop
    const parent = node.offsetParent as HTMLElement | null
    if (parent && parent !== box && !box.contains(parent)) break
    node = parent
  }
  return { x, y }
}

/** Cursor keyframes: hold, travel into each stop, dip on click. Offsets are shares of SCENE_MS. */
export function cursorKeyframes(start: Point, stops: readonly Placed[]): Keyframe[] {
  const at = (ms: number) => Math.min(1, Math.max(0, ms / SCENE_MS))
  const pose = (p: Point, scale = 1) => `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) scale(${scale})`
  const first = stops[0]
  if (!first) return []
  const appear = Math.max(0, first.at - CURSOR_TRAVEL_MS - 250)
  const frames: Keyframe[] = [
    { offset: 0, transform: pose(start), opacity: 0 },
    { offset: at(appear), transform: pose(start), opacity: 0 },
    { offset: at(appear + 250), transform: pose(start), opacity: 1 },
  ]
  let from = start
  for (const stop of stops) {
    frames.push({ offset: at(stop.at - CURSOR_TRAVEL_MS), transform: pose(from), opacity: 1, easing: 'ease-in-out' })
    frames.push({ offset: at(stop.at), transform: pose(stop.point), opacity: 1 })
    if (stop.click) {
      frames.push({ offset: at(stop.at + 120), transform: pose(stop.point, 0.82), opacity: 1 })
      frames.push({ offset: at(stop.at + 300), transform: pose(stop.point), opacity: 1 })
    }
    from = stop.point
  }
  frames.push({ offset: 1, transform: pose(from), opacity: 1 })
  // Keyframe offsets must not decrease; stops closer than the travel time collapse into each other.
  let last = 0
  return frames.map((f) => { last = Math.max(last, f.offset ?? 0); return { ...f, offset: last } })
}

export interface StageProps {
  children: ComponentChildren
  stops?: readonly CursorStop[]
  still?: boolean
  label: string
}

/**
 * The demo panel: scales the scene down to fit the window (S is 480 tall), then
 * places the cursor and click ripples on the measured targets.
 */
export function Stage({ children, stops = [], still = false, label }: StageProps) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const cursor = useRef<SVGSVGElement>(null)
  const scaleRef = useRef(1)
  const clock = useRef<number | null>(null)
  const [scale, setScale] = useState(1)
  const [placed, setPlaced] = useState<Placed[]>([])

  // Fit once per resize: start from 1 and only ever shrink. offsetHeight ignores the
  // transform and the inner box widens by 1 / scale, so each step is shorter text; a
  // monotone, capped walk can't oscillate on wrap points. Observing the inner box too
  // catches late font loads.
  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return undefined
    const fit = () => {
      let s = 1
      for (let step = 0; step < 4; step++) {
        i.style.setProperty('--ob-scale', String(s))
        const next = i.offsetHeight > 0 && o.clientHeight > 0 ? Math.min(1, o.clientHeight / i.offsetHeight) : 1
        if (next >= s - 0.01) break
        s = next
      }
      i.style.setProperty('--ob-scale', String(scaleRef.current))
      if (Math.abs(s - scaleRef.current) > 0.01) { scaleRef.current = s; setScale(s) }
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(fit)
    observer.observe(o)
    observer.observe(i)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const i = inner.current
    if (still || !i) { setPlaced([]); return }
    setPlaced(stops.flatMap((s) => (s.target.current
      ? [{ at: s.at, click: s.click ?? false, point: pointIn(i, s.target.current, s.fx ?? 0.5, s.fy ?? 0.5) }]
      : [])))
  }, [stops, still, scale])

  // A resize re-measures the stops; carry the clock over so the cursor stays in step with the CSS timeline.
  useEffect(() => {
    const el = cursor.current
    const i = inner.current
    if (!el || !i || placed.length === 0 || typeof el.animate !== 'function') return undefined
    const start = { x: i.offsetWidth * 0.72, y: i.offsetHeight * 0.94 }
    const animation = el.animate(cursorKeyframes(start, placed), { duration: SCENE_MS, fill: 'forwards' })
    if (clock.current !== null) animation.currentTime = clock.current
    return () => {
      const t = animation.currentTime
      clock.current = typeof t === 'number' ? t : null
      animation.cancel()
    }
  }, [placed])

  const style = { '--ob-scale': String(scale) } as Style
  // The scene is a picture of the UI: its buttons are not real controls, so keep them out of the tab order and a11y tree.
  const inert = { inert: '' } as Record<string, string>
  return (
    <div ref={outer} class={`bb-ob-stage${still ? ' bb-ob-still' : ''}`} role="img" aria-label={label}>
      <div ref={inner} class="bb-ob-stage__inner" style={style} {...inert}>
        {children}
        {placed.filter((p) => p.click).map((p) => (
          <span key={p.at} class="bb-ob-ripple" aria-hidden="true" style={{ left: `${p.point.x}px`, top: `${p.point.y}px`, '--ob-d': `${p.at + 100}ms` } as Style} />
        ))}
        {placed.length > 0 && (
          <svg ref={cursor} class="bb-ob-cursor" viewBox="0 0 14 20" aria-hidden="true">
            <path d="M1 1V17L5.6 12.8L8.6 19.6L11.4 18.4L8.4 11.6H14.4Z" />
          </svg>
        )}
      </div>
    </div>
  )
}

/** Re-mounts the scene every SCENE_MS + SCENE_REST_MS so the demo loops; restarts with each step, frozen when still. */
export function useSceneLoop(still: boolean, stepKey: string): number {
  const [run, setRun] = useState(0)
  useEffect(() => {
    setRun(0)
    if (still) return undefined
    const id = setInterval(() => setRun((n) => n + 1), SCENE_MS + SCENE_REST_MS)
    return () => clearInterval(id)
  }, [still, stepKey])
  return run
}
