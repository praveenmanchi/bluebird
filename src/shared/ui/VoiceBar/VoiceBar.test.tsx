import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { VoiceBar } from './VoiceBar'

describe('VoiceBar', () => {
  it('defaults to State=Idle with the Figma copy and an idle wave', () => {
    const { container } = render(<VoiceBar />)
    expect(container.querySelector('.bb-voice-bar')).toHaveAttribute('data-state', 'idle')
    expect(screen.getByText('Hold the mic to talk to the agent, or type a request…')).toBeInTheDocument()
    expect(screen.getByText('Voice or text')).toBeInTheDocument()
    expect(container.querySelector('.bb-voice-wave')).toHaveAttribute('data-state', 'idle')
  })
  it('passes its State to the composed Voice Wave and swaps the copy', () => {
    const { container, rerender } = render(<VoiceBar state="listening" />)
    expect(container.querySelector('.bb-voice-wave')).toHaveAttribute('data-state', 'listening')
    expect(screen.getByText('Listening… release to send')).toBeInTheDocument()
    rerender(<VoiceBar state="speaking" />)
    expect(container.querySelector('.bb-voice-wave')).toHaveAttribute('data-state', 'speaking')
    expect(screen.getByText('Accessibility agent is speaking')).toBeInTheDocument()
  })
  it('renders transcript and caption overrides', () => {
    render(<VoiceBar state="speaking" transcript="Fixed 4 issues." caption="Content agent is speaking" />)
    expect(screen.getByText('Fixed 4 issues.')).toBeInTheDocument()
    expect(screen.getByText('Content agent is speaking')).toBeInTheDocument()
  })
  it('the mic is a toggle button that fires onToggle', () => {
    const onToggle = vi.fn()
    const { rerender } = render(<VoiceBar onToggle={onToggle} />)
    const mic = screen.getByRole('button', { name: 'Microphone' })
    expect(mic).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(mic)
    expect(onToggle).toHaveBeenCalledTimes(1)
    rerender(<VoiceBar state="listening" onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Microphone' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('forwards live levels to the wave', () => {
    const { container } = render(<VoiceBar state="listening" levels={[0.5]} />)
    expect(container.querySelector<HTMLElement>('.bb-voice-wave__bar')!.style.height).toBe('50%')
  })
})
