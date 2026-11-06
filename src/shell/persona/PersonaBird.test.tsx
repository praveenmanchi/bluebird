import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/preact'
import { FLIGHT_MS, PersonaBird, SAY_MS } from './PersonaBird'

const button = () => screen.getByRole('button', { name: /fly/ })
const LINE = '“Tokens or it didn’t happen.”'

describe('PersonaBird', () => {
  afterEach(() => vi.useRealTimers())

  it('draws the persona’s own bird in its frame', () => {
    const { container } = render(<PersonaBird personaId="ux-designer" label="UX Designer" />)
    expect(container.querySelector('.bb-persona-bird__frame .bb-bird--ux-designer')).toHaveClass('is-playing')
    expect(button()).toHaveAccessibleName('UX Designer bird: fly')
  })

  it('falls back to the plain bird for a persona without copy', () => {
    const { container } = render(<PersonaBird personaId="new-role" label="New role" />)
    expect(container.querySelector('.bb-bird--plain')).not.toBeNull()
  })

  it('plays the whole sequence by itself on arrival: flies, lands, says its line, settles', () => {
    vi.useFakeTimers()
    const { container } = render(<PersonaBird personaId="design-system" label="Design System" />)
    const root = container.querySelector('.bb-persona-bird')
    expect(root).toHaveClass('is-flying')
    expect(container.querySelector('.bb-bird')).toHaveClass('is-flapping')
    expect(screen.queryByText(LINE)).toBeNull()
    act(() => { vi.advanceTimersByTime(FLIGHT_MS) })
    expect(root).not.toHaveClass('is-flying')
    expect(screen.getByText(LINE)).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(SAY_MS) })
    expect(screen.queryByText(LINE)).toBeNull()
  })

  it('flies away and back again on a click', () => {
    vi.useFakeTimers()
    const { container } = render(<PersonaBird personaId="design-system" label="Design System" />)
    act(() => { vi.advanceTimersByTime(FLIGHT_MS + SAY_MS) })
    fireEvent.click(button())
    expect(container.querySelector('.bb-persona-bird')).toHaveClass('is-flying')
    act(() => { vi.advanceTimersByTime(FLIGHT_MS) })
    expect(screen.getByText(LINE)).toBeInTheDocument()
  })

  it('ignores clicks while it is in the air', () => {
    vi.useFakeTimers()
    render(<PersonaBird personaId="design-system" label="Design System" />)
    act(() => { vi.advanceTimersByTime(FLIGHT_MS - 100) })
    fireEvent.click(button())
    act(() => { vi.advanceTimersByTime(100) })
    expect(screen.getByText(LINE)).toBeInTheDocument()
  })

  it('turns towards the pointer and back', async () => {
    const { container } = render(<PersonaBird personaId="developer" label="Developer" />)
    const root = container.querySelector('.bb-persona-bird') as HTMLElement
    vi.spyOn(button(), 'getBoundingClientRect').mockReturnValue({ left: 0, width: 100 } as DOMRect)
    const look = (value: string) => waitFor(() => expect(root.style.getPropertyValue('--pp-look')).toBe(value))
    fireEvent.mouseMove(button(), { clientX: 100 })
    await look('1')
    fireEvent.mouseMove(button(), { clientX: 0 })
    await look('-1')
    fireEvent.mouseLeave(button())
    await look('0')
  })
})
