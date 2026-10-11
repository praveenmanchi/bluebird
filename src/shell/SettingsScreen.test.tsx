import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { SettingsScreen } from './SettingsScreen'

const noop = () => Promise.resolve()
const personas = [
  { id: 'product-designer', label: 'Product Designer', tabs: [{ id: 'a11y', label: 'Accessibility', icon: 'accessibility' }, { id: 'jira', label: 'Jira board', icon: 'jira' }] },
  { id: 'design-system', label: 'Design System', tabs: [{ id: 'tokens', label: 'Tokens', icon: 'variables' }] },
]

describe('SettingsScreen', () => {
  it('renders the session summary as the composed Toggle with its switch hidden (Figma Toggle=false)', () => {
    const { container } = render(<SettingsScreen session={{ brandId: 'ikea', since: '2026-09-22T09:00:00Z' }} brand={null} onLogout={noop} onReset={noop} />)
    const row = container.querySelector('.bb-settings .bb-toggle')
    expect(row).not.toBeNull()
    expect(row?.querySelector('.bb-toggle__title')?.textContent).toBe('Signed in as Ikea')
    expect(row?.querySelector('.bb-toggle__description')?.textContent).toMatch(/You stay signed in until you log off/)
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('offers the persona switch when more than one persona is configured, listing the active persona’s tabs', () => {
    render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} personas={personas} personaId="product-designer" onPersonaChange={() => undefined} />)
    const group = screen.getByRole('tablist', { name: 'Persona' })
    expect(group.querySelectorAll('[role="tab"]')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Product Designer' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(/Accessibility, Jira board/)).toBeTruthy()
  })

  it('reports the chosen persona by id', () => {
    const onPersonaChange = vi.fn()
    render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} personas={personas} personaId="product-designer" onPersonaChange={onPersonaChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Design System' }))
    expect(onPersonaChange).toHaveBeenCalledWith('design-system')
  })

  it('hides the persona switch when there is only one persona', () => {
    render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} personas={personas.slice(0, 1)} personaId="product-designer" onPersonaChange={() => undefined} />)
    expect(screen.queryByRole('tablist', { name: 'Persona' })).toBeNull()
  })

  it('ends with the Team Banner, after the actions', () => {
    const { container } = render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} />)
    const settings = container.querySelector('.bb-settings')!
    expect(settings.lastElementChild?.classList.contains('bb-team-banner')).toBe(true)
    expect(settings.querySelector('.bb-team-banner__credit')?.textContent).toBe('Built with Care by the HCL Design System Team')
  })

  it('with the integrations store, opens on the persona card and lists the integration sections before the Team Banner', async () => {
    const api = { load: async () => DEFAULT_INTEGRATIONS, save: async (_s: string, v: unknown) => v as never }
    const { container } = render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} personas={personas} personaId="design-system" onPersonaChange={() => undefined} integrations={api} />)
    await screen.findByRole('region', { name: 'Jira Integration' })
    const settings = container.querySelector('.bb-settings')!
    expect(settings.firstElementChild?.classList.contains('bb-persona-card')).toBe(true)
    expect(settings.querySelector('.bb-persona-card')?.textContent).toContain('Design System')
    expect(settings.lastElementChild?.previousElementSibling?.classList.contains('bb-integrations')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Change the persona' }))
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Design System' }))
  })

  it('leaves the integration sections out without a store', () => {
    const { container } = render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} />)
    expect(container.querySelector('.bb-integrations')).toBeNull()
    expect(container.querySelector('.bb-persona-card')).toBeNull()
  })

  it('offers to replay the product tour only when the shell passes a handler', () => {
    const onReplayTour = vi.fn()
    const { unmount } = render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} onReplayTour={onReplayTour} />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay tour' }))
    expect(onReplayTour).toHaveBeenCalledOnce()
    unmount()
    render(<SettingsScreen session={null} brand={null} onLogout={noop} onReset={noop} />)
    expect(screen.queryByRole('button', { name: 'Replay tour' })).toBeNull()
  })
})
