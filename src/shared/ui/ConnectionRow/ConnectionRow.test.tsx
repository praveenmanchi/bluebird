import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ConnectionRow } from './ConnectionRow'

describe('ConnectionRow', () => {
  it('renders the Figma default: good status, name, detail and the Switch link', () => {
    const { container } = render(<ConnectionRow />)
    expect(container.querySelector('.bb-connection-row')?.getAttribute('data-status')).toBe('good')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-good')
    expect(screen.getByRole('img', { name: 'Connected' })).toBeInTheDocument()
    expect(screen.getByText('Figma MCP server')).toBeInTheDocument()
    expect(screen.getByText('Remote · mcp.figma.com/mcp')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch' }).tagName).toBe('BUTTON')
  })
  it('hides the action when Show action is off', () => {
    render(<ConnectionRow showAction={false} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('fires onAction with a custom label', () => {
    const calls: string[] = []
    render(<ConnectionRow actionLabel="Change" onAction={() => calls.push('change')} />)
    screen.getByRole('button', { name: 'Change' }).click()
    expect(calls).toEqual(['change'])
  })
  it('maps status to the glyph and data-status', () => {
    const { container } = render(<ConnectionRow status="error" name="Local server" />)
    expect(container.querySelector('.bb-connection-row')?.getAttribute('data-status')).toBe('error')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-error')
    expect(screen.getByText('Local server')).toBeInTheDocument()
  })
})
