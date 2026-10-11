import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { VoiceWave, VOICE_WAVE_BARS } from './VoiceWave'

describe('VoiceWave', () => {
  it('defaults to State=Idle with the nine Figma bars', () => {
    const { container } = render(<VoiceWave />)
    const wave = container.querySelector('.bb-voice-wave')!
    expect(wave.getAttribute('data-state')).toBe('idle')
    expect(wave.querySelectorAll('.bb-voice-wave__bar')).toHaveLength(VOICE_WAVE_BARS)
    expect(VOICE_WAVE_BARS).toBe(9)
  })
  it('maps each Figma State to data-state and an accessible name', () => {
    const { rerender } = render(<VoiceWave state="listening" />)
    expect(screen.getByRole('img', { name: 'Listening' })).toHaveAttribute('data-state', 'listening')
    rerender(<VoiceWave state="speaking" />)
    expect(screen.getByRole('img', { name: 'Agent speaking' })).toHaveAttribute('data-state', 'speaking')
  })
  it('drives bar heights from live levels, clamped to 0–1', () => {
    const { container } = render(<VoiceWave state="listening" levels={[0.5, 2, -1]} />)
    const bars = container.querySelectorAll<HTMLElement>('.bb-voice-wave__bar')
    expect(container.querySelector('.bb-voice-wave')).toHaveAttribute('data-live', 'true')
    expect(bars[0]!.style.height).toBe('50%')
    expect(bars[1]!.style.height).toBe('100%')
    expect(bars[2]!.style.height).toBe('0%')
    expect(bars[8]!.style.height).toBe('0%')
  })
  it('ignores levels while idle', () => {
    const { container } = render(<VoiceWave levels={[1, 1, 1]} />)
    expect(container.querySelector('.bb-voice-wave')).not.toHaveAttribute('data-live')
    expect(container.querySelector<HTMLElement>('.bb-voice-wave__bar')!.style.height).toBe('')
  })
})
