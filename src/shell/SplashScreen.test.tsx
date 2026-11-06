import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/preact'
import { SplashScreen, SPLASH_MS } from './SplashScreen'

const LEAVE_ALLOWANCE = 300

describe('SplashScreen', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('shows only the brand logo and moves on by itself', () => {
    const onDone = vi.fn()
    const { container } = render(<SplashScreen brand="ikea" onDone={onDone} />)
    const splash = screen.getByRole('region', { name: 'Loading' })
    expect(container.querySelector('.bb-splash__logo')).toBeInTheDocument()
    expect(splash.children).toHaveLength(1)
    expect(splash).not.toHaveTextContent('Design Studio')
    act(() => { vi.advanceTimersByTime(SPLASH_MS - 1) })
    expect(onDone).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    act(() => { vi.advanceTimersByTime(LEAVE_ALLOWANCE) })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('skips on click or key press, only once', () => {
    const onDone = vi.fn()
    render(<SplashScreen onDone={onDone} />)
    const splash = screen.getByRole('region', { name: 'Loading' })
    fireEvent.click(splash)
    fireEvent.keyDown(splash, { key: 'Enter' })
    act(() => { vi.advanceTimersByTime(SPLASH_MS + LEAVE_ALLOWANCE) })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('ignores a key still held down from the login form', () => {
    const onDone = vi.fn()
    render(<SplashScreen onDone={onDone} />)
    fireEvent.keyDown(screen.getByRole('region', { name: 'Loading' }), { key: 'Enter', repeat: true })
    act(() => { vi.advanceTimersByTime(LEAVE_ALLOWANCE) })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('holds when still', () => {
    const onDone = vi.fn()
    render(<SplashScreen onDone={onDone} still />)
    fireEvent.click(screen.getByRole('region', { name: 'Loading' }))
    act(() => { vi.advanceTimersByTime(SPLASH_MS * 2) })
    expect(onDone).not.toHaveBeenCalled()
  })
})
