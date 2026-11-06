import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { AiScenario, scenarioCopy, sceneForFailure } from './AiScenario'
import { BOT_SCENES } from '../BotScene/BotScene'

describe('AiScenario', () => {
  it('shows the scene, the title and the body', () => {
    const { container } = render(<AiScenario surface="uxai" scene="wire-cut" provider="Claude" />)
    expect(screen.getByRole('heading', { name: 'Someone tripped over the wire' })).toBeInTheDocument()
    expect(screen.getByText(/I couldn’t reach Claude/)).toBeInTheDocument()
    expect(container.querySelector('.bb-bot-scene')!.getAttribute('data-scene')).toBe('wire-cut')
  })

  it('makes the first action primary and runs it', () => {
    const retry = vi.fn()
    const { container } = render(<AiScenario surface="uxai" scene="wire-cut" actions={[{ label: 'Try again', onClick: retry }, { label: 'Check Settings' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(container.querySelectorAll('button')).toHaveLength(2)
  })

  it('lets a screen replace the body with what it knows', () => {
    render(<AiScenario surface="agents" scene="fix-stuck" body="6 of 8 fixes went in." />)
    expect(screen.getByText('6 of 8 fixes went in.')).toBeInTheDocument()
  })

  it('has copy for every scene on both surfaces', () => {
    for (const scene of BOT_SCENES) for (const surface of ['uxai', 'agents'] as const) {
      const copy = scenarioCopy(scene, { surface })
      expect(copy.title).not.toBe('')
      expect(copy.body).not.toBe('')
    }
  })

  it('tells the agents and UX AI apart where the words differ', () => {
    expect(scenarioCopy('connection-lost', { surface: 'uxai' }).title).toBe('The line dropped mid-sentence')
    expect(scenarioCopy('connection-lost', { surface: 'agents' }).title).toBe('The line dropped mid-run')
  })

  it('maps each failure to its scene', () => {
    expect(sceneForFailure('network')).toBe('wire-cut')
    expect(sceneForFailure('lost')).toBe('connection-lost')
    expect(sceneForFailure('timeout')).toBe('timed-out')
    expect(sceneForFailure('key')).toBe('wrong-key')
    expect(sceneForFailure('rate')).toBe('too-many-requests')
    expect(sceneForFailure('model')).toBe('default-needed')
    expect(sceneForFailure('unreadable')).toBe('something-broke')
    expect(sceneForFailure('other')).toBe('something-broke')
  })
})
