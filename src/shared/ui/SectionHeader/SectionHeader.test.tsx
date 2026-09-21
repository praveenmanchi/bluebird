import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  it('renders a heading, description and the integration logo', () => {
    render(<SectionHeader title="GitHub" description="Configure the repository." logo="github" />)
    expect(screen.getByRole('heading', { level: 2, name: 'GitHub' })).toBeInTheDocument()
    expect(screen.getByText('Configure the repository.').className).toContain('bb-section-header__description')
    expect(screen.getByRole('img', { name: 'github' }).getAttribute('data-logo')).toBe('github')
    expect(screen.getByRole('banner').dataset.logo).toBe('github')
  })
  it('hides the logo, title and toggle when their Figma booleans are off', () => {
    const { container } = render(<SectionHeader description="Only text" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(container.querySelector('.bb-section-header')?.hasAttribute('data-toggle')).toBe(false)
  })
  it('renders the composed Toggle and reports changes', () => {
    const onToggle = vi.fn()
    render(<SectionHeader title="Compare" toggle checked={false} onToggle={onToggle} />)
    const sw = screen.getByRole('switch', { name: 'Compare' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(onToggle).toHaveBeenCalledWith(true)
  })
  it('prefers a custom trailing slot and honours the heading level', () => {
    render(<SectionHeader title="Custom" as="h3" toggle trailing={<button type="button">Edit</button>} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Custom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
