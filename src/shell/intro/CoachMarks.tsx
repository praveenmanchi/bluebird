import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Button } from '@shared/ui'
import { arrowFor, holeRect, placeCard, unionRect, type Arrow, type Placement, type Rect } from './geometry'
import type { IntroStep } from './steps'
import './CoachMarks.css'

export interface CoachMarksProps {
  steps: readonly IntroStep[]
  /** Accessible name of the tour, e.g. "Variable search intro". */
  label: string
  /** `completed` is true when the last step's button closed it, false for Skip or Escape. */
  onClose: (completed: boolean) => void
  /** First step's primary label. */
  startLabel?: string
  /** Last step's primary label. */
  doneLabel?: string
  skipLabel?: string
  /** Hide the step count and dots (a single coach mark, e.g. "Here is the new tab"). */
  hideProgress?: boolean
}

interface Layout { hole: Rect | null; card: Placement; arrow: Arrow | null; view: { width: number; height: number } }

/** Matches for a step's selector(s), in document order. */
export function targetsOf(step: IntroStep, root: ParentNode = document): Element[] {
  if (!step.target) return []
  const selectors = typeof step.target === 'string' ? [step.target] : step.target
  return selectors.flatMap((s) => {
    try {
      if (step.first) { const el = root.querySelector(s); return el ? [el] : [] }
      return [...root.querySelectorAll(s)]
    } catch {
      return []
    }
  })
}

const visible = (el: Element): boolean => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }

/** A numeric token read off the root, e.g. --bb-intro-spotlight-padding → 4. */
function tokenNumber(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

/** Even-odd path: the whole view minus a rounded hole. */
function scrimPath(view: { width: number; height: number }, hole: Rect | null, r: number): string {
  const outer = `M0 0H${view.width}V${view.height}H0Z`
  if (!hole || hole.width <= 0 || hole.height <= 0) return outer
  const { x, y, width: w, height: h } = hole
  const k = Math.min(r, w / 2, h / 2)
  return `${outer}M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
}

/**
 * Figma "Coach Mark" (40002953:8512) on a 50% scrim: the target is cut out and ringed, a curved
 * arrow runs from the card to it, and "Skip tour" sits in the plugin's top-right corner.
 */
export function CoachMarks({ steps: all, label, onClose, startLabel = 'Start', doneLabel = 'Done', skipLabel = 'Skip tour', hideProgress = false }: CoachMarksProps) {
  // Optional steps whose target isn't rendered (Dev Mode hides the size controls) are dropped up front.
  const steps = useMemo(() => all.filter((s) => !s.optional || targetsOf(s).some(visible)), [all])
  const [index, setIndex] = useState(0)
  const [layout, setLayout] = useState<Layout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = steps[index]
  const last = index === steps.length - 1
  const titleId = `bb-intro-title-${index}`

  const close = (completed: boolean) => { onClose(completed) }
  const next = () => { if (last) close(true); else setIndex((i) => i + 1) }
  const back = () => { setIndex((i) => Math.max(0, i - 1)) }

  // Bring the target into view, then measure it and the card.
  useLayoutEffect(() => {
    if (!step) return undefined
    const els = targetsOf(step).filter(visible)
    els[0]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    const measure = () => {
      const view = { width: window.innerWidth, height: window.innerHeight }
      const target = unionRect(targetsOf(step).filter(visible).map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left, y: r.top, width: r.width, height: r.height }
      }))
      const hole = target ? holeRect(target, tokenNumber('--bb-intro-spotlight-padding', 4), view) : null
      const card = cardRef.current
      const size = { width: card?.offsetWidth ?? 288, height: card?.offsetHeight ?? 160 }
      const footer = document.querySelector('.bb-footer')?.getBoundingClientRect().height ?? 0
      const placed = placeCard(hole, size, view, footer)
      const arrow = hole ? arrowFor(hole, { x: placed.x, y: placed.y, ...size }, placed.side) : null
      setLayout({ hole, card: placed, arrow, view })
    }
    measure()
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [step])

  useEffect(() => { cardRef.current?.querySelector<HTMLButtonElement>('.bb-intro__next')?.focus() }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!step) return null
  const radius = tokenNumber('--bb-intro-spotlight-radius', 4)
  const view = layout?.view ?? { width: window.innerWidth, height: window.innerHeight }
  const hole = layout?.hole ?? null
  const arrow = layout?.arrow ?? null

  return (
    <div class="bb-intro" role="dialog" aria-modal="true" aria-label={label} aria-describedby={titleId} data-step={index + 1}>
      <svg class="bb-intro__scrim" width={view.width} height={view.height} viewBox={`0 0 ${view.width} ${view.height}`} aria-hidden="true">
        <path d={scrimPath(view, hole, radius)} fill-rule="evenodd" />
      </svg>
      {hole && <div class="bb-intro__ring" style={{ left: hole.x, top: hole.y, width: hole.width, height: hole.height }} aria-hidden="true" />}
      {arrow && (
        <svg class="bb-intro__arrow" width={view.width} height={view.height} viewBox={`0 0 ${view.width} ${view.height}`} aria-hidden="true">
          <defs>
            <marker id="bb-intro-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10Z" class="bb-intro__head" />
            </marker>
          </defs>
          <path d={arrow.d} class="bb-intro__line" marker-end="url(#bb-intro-head)" />
          <circle cx={arrow.start.x} cy={arrow.start.y} r="3.5" class="bb-intro__dot" />
        </svg>
      )}
      {(!last || hideProgress) && <button type="button" class="bb-intro__skip" onClick={() => close(false)}>{skipLabel}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg></button>}
      <div
        ref={cardRef}
        class="bb-intro__card"
        style={layout ? { left: layout.card.x, top: layout.card.y } : { visibility: 'hidden' }}
        data-side={layout?.card.side}
      >
        {!hideProgress && <span class="bb-intro__count">{index + 1} of {steps.length}</span>}
        <div class="bb-intro__copy">
          <h2 id={titleId} class="bb-intro__title">{step.title}</h2>
          <p class="bb-intro__body">{step.body}</p>
        </div>
        <div class="bb-intro__actions">
          {!hideProgress && steps.length > 1 && (
            <span class="bb-intro__dots" aria-hidden="true">
              {steps.map((_, i) => <span key={i} class="bb-intro__progress-dot" data-active={i === index || undefined} />)}
            </span>
          )}
          <span class="bb-intro__spacer" />
          {index > 0 && <Button variant="secondary" onClick={back}>Back</Button>}
          <Button class="bb-intro__next" onClick={next}>{index === 0 && !last ? startLabel : last ? doneLabel : 'Next'}</Button>
        </div>
      </div>
    </div>
  )
}
