// Live story thumbnail for the components overview. Renders the story inline
// through the docs context (the mechanism behind the <Story> docs block), so the
// decorators run and the thumbnail follows the brand global with no iframes.
import type { PreactContext, RefObject } from 'preact'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'
import { DocsContext } from '@storybook/addon-docs/blocks'
import type { DocsContextProps } from 'storybook/internal/types'

/** Stories render at plugin scale; never blow a tiny atom up past this. */
const MAX_SCALE = 1.5
/** Start rendering a little before the card scrolls into view. */
const PRELOAD_MARGIN = '300px'

const docsContext = DocsContext as unknown as PreactContext<DocsContextProps | undefined>

type Status = 'idle' | 'rendering' | 'ready' | 'failed'

/** Starts once the element is near the viewport, then stays started. */
function useNearViewport<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), { rootMargin: PRELOAD_MARGIN })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return [ref, near]
}

/** A whole-fit scale below this share of the width-fit scale means the story is tall: crop it instead. */
const CROP_THRESHOLD = 0.6

interface Fit { scale: number; crop: boolean; width?: number }

/**
 * Scale for the rendered story inside its frame, re-measured as either resizes. Short stories fit
 * whole; tall ones (screens) fit the width and crop from the top, like a page screenshot. Fluid
 * stories lay out in the plugin-width stage; fixed-width ones wider than it widen the stage.
 */
function useFit(frame: RefObject<HTMLElement>, stage: RefObject<HTMLElement>, active: boolean): Fit {
  const [fit, setFit] = useState<Fit>({ scale: 1, crop: false })
  useEffect(() => {
    const f = frame.current
    const s = stage.current
    if (!active || !f || !s) return
    const measure = () => {
      const w = s.offsetWidth
      const h = s.offsetHeight
      if (!w || !h) return
      if (s.scrollWidth > w + 1) {
        setFit((prev) => ({ ...prev, width: s.scrollWidth })) // the resize re-runs measure
        return
      }
      const byWidth = Math.min(MAX_SCALE, f.clientWidth / w)
      const whole = Math.min(byWidth, f.clientHeight / h)
      const crop = whole < byWidth * CROP_THRESHOLD
      setFit((prev) => ({ ...prev, scale: crop ? byWidth : whole, crop }))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(f)
    ro.observe(s)
    measure()
    return () => ro.disconnect()
  }, [frame, stage, active])
  return fit
}

interface ThumbnailProps { storyId: string; fallback: string }

export function Thumbnail({ storyId, fallback }: ThumbnailProps) {
  const docs = useContext(docsContext)
  const [frameRef, near] = useNearViewport<HTMLDivElement>()
  const stageRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const { scale, crop, width } = useFit(frameRef, stageRef, status === 'ready')

  useEffect(() => {
    const stage = stageRef.current
    if (!near || !docs || !stage) return
    let live = true
    let teardown: (() => Promise<void>) | undefined
    setStatus('rendering')
    docs.loadStory(storyId).then(
      (story) => {
        if (!live) return
        teardown = docs.renderStoryToElement(
          story,
          stage,
          {
            showMain: () => live && setStatus('ready'),
            showError: () => live && setStatus('failed'),
            showException: () => live && setStatus('failed'),
          },
          { autoplay: false, forceInitialArgs: true },
        )
        // Some renderers never call showMain for a synchronous render; the stage content is the signal.
        requestAnimationFrame(() => live && stage.childElementCount > 0 && setStatus((s) => (s === 'rendering' ? 'ready' : s)))
      },
      () => live && setStatus('failed'),
    )
    return () => {
      live = false
      if (teardown) void Promise.resolve().then(teardown)
    }
  }, [near, docs, storyId])

  return (
    <div ref={frameRef} class="bbs-thumb" data-status={status} data-crop={crop || undefined} aria-hidden="true" inert>
      <div ref={stageRef} class="bbs-thumb__stage" style={{ transform: `scale(${scale})`, ...(width ? { width: `${width}px`, maxWidth: 'none' } : {}) }} />
      {status !== 'ready' && <span class="bbs-thumb__fallback">{fallback}</span>}
    </div>
  )
}
