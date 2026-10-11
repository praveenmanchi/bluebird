import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, renderHook, act } from '@testing-library/preact'
import { createRef } from 'preact'
import { Fx, SCENE_MS, SCENE_REST_MS, Stage, Swap, cursorKeyframes, pointIn, reveal, useSceneLoop } from './stage'

const p = (x: number, y: number) => ({ x, y })

describe('reveal', () => {
  it('keeps the element’s own class and sets the delay', () => {
    expect(reveal(300, 'pop', 'bb-ob-row')).toEqual({ class: 'bb-ob-row bb-ob-rv bb-ob-rv--pop', style: { '--ob-d': '300ms' } })
    expect(reveal(0).class).toBe('bb-ob-rv bb-ob-rv--up')
  })
})

describe('cursorKeyframes', () => {
  it('fades in, travels into each stop and dips on click', () => {
    const frames = cursorKeyframes(p(100, 400), [
      { at: 1200, click: true, point: p(50, 20) },
      { at: 3000, click: false, point: p(10, 300) },
    ])
    expect(frames[0]).toMatchObject({ offset: 0, opacity: 0 })
    expect(frames.find((f) => f.offset === 1200 / SCENE_MS)?.transform).toBe('translate(50px, 20px) scale(1)')
    expect(frames.some((f) => String(f.transform).endsWith('scale(0.82)'))).toBe(true)
    expect(frames.at(-1)).toMatchObject({ offset: 1, transform: 'translate(10px, 300px) scale(1)' })
  })

  it('never lets offsets go backwards, even for stops closer than the travel time', () => {
    const frames = cursorKeyframes(p(0, 0), [
      { at: 300, click: true, point: p(1, 1) },
      { at: 500, click: true, point: p(2, 2) },
    ])
    const offsets = frames.map((f) => f.offset ?? 0)
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(0)
  })

  it('has nothing to animate without stops', () => {
    expect(cursorKeyframes(p(0, 0), [])).toEqual([])
  })
})

describe('Stage', () => {
  it('labels the demo and skips the cursor when still', () => {
    const target = createRef<HTMLButtonElement>()
    const { getByRole, container } = render(
      <Stage still label="Demo" stops={[{ at: 1000, target, click: true }]}><button ref={target}>Go</button></Stage>,
    )
    expect(getByRole('img', { name: 'Demo' })).toHaveClass('bb-ob-still')
    expect(container.querySelector('.bb-ob-cursor')).toBeNull()
    expect(container.querySelector('.bb-ob-ripple')).toBeNull()
  })

  it('places the cursor and a ripple for each click while playing', () => {
    const target = createRef<HTMLButtonElement>()
    const { container } = render(<Stage label="Demo" stops={[{ at: 1000, target, click: true }]}><button ref={target}>Go</button></Stage>)
    expect(container.querySelector('.bb-ob-cursor')).not.toBeNull()
    expect(container.querySelectorAll('.bb-ob-ripple')).toHaveLength(1)
  })
})

describe('Swap and Fx', () => {
  it('stacks both states and hides the first from assistive tech', () => {
    const { getByText } = render(<Swap enter={0} at={500} before={<span>Before</span>} after={<span>After</span>} />)
    expect(getByText('Before').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(getByText('After').parentElement).toHaveClass('bb-ob-swap__after')
  })

  it('renders the child untouched when there is no effect', () => {
    const { container } = render(<Fx kind="pulse"><b>child</b></Fx>)
    expect(container.querySelector('.bb-ob-fx')).toBeNull()
    expect(container.textContent).toBe('child')
  })
})

describe('useSceneLoop', () => {
  afterEach(() => { vi.useRealTimers() })

  it('counts runs while playing and restarts the clock on a new step', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ step }: { step: string }) => useSceneLoop(false, step), { initialProps: { step: 'a' } })
    act(() => { vi.advanceTimersByTime(SCENE_MS + SCENE_REST_MS) })
    expect(result.current).toBe(1)
    act(() => { vi.advanceTimersByTime(SCENE_MS) })
    rerender({ step: 'b' })
    expect(result.current).toBe(0)
    act(() => { vi.advanceTimersByTime(SCENE_REST_MS + 100) })
    expect(result.current).toBe(0)
  })

  it('stays put when still', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSceneLoop(true, 'a'))
    act(() => { vi.advanceTimersByTime(60000) })
    expect(result.current).toBe(0)
  })
})

describe('pointIn', () => {
  it('sums the offset chain up to the stage box and ignores transforms', () => {
    const box = document.createElement('div')
    const card = document.createElement('div')
    const target = document.createElement('button')
    box.append(card); card.append(target)
    const set = (el: HTMLElement, left: number, top: number, parent: HTMLElement | null, w = 0, h = 0) => {
      Object.defineProperties(el, { offsetLeft: { value: left }, offsetTop: { value: top }, offsetParent: { value: parent }, offsetWidth: { value: w }, offsetHeight: { value: h } })
    }
    set(card, 16, 40, box); set(target, 8, 10, card, 100, 20)
    target.style.transform = 'translateY(12px) scale(0.6)'
    expect(pointIn(box, target, 0.5, 0.5)).toEqual({ x: 74, y: 60 })
  })
})

