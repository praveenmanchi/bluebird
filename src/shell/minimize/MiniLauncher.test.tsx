import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { MiniLauncher } from './MiniLauncher'

describe('MiniLauncher', () => {
  it('is one button that restores the plugin, by click or keyboard', () => {
    const onRestore = vi.fn()
    render(<MiniLauncher personaId="design-system" onRestore={onRestore} />)
    const button = screen.getByRole('button', { name: 'Open Bluebird' })
    expect(button).toHaveAttribute('title', 'Open Bluebird')
    fireEvent.click(button)
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it('shows the persona’s bird', () => {
    const { container } = render(<MiniLauncher personaId="design-system" onRestore={() => undefined} />)
    expect(container.querySelector('.bb-mini-launcher__bubble svg')).not.toBeNull()
  })
})
