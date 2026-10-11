import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/preact'
import { Pipeline } from './Pipeline'

const links = (c: Element) => [...c.querySelectorAll('.bb-pipeline__link')].map((l) => l.hasAttribute('data-active'))

describe('Pipeline', () => {
  it('renders the Figma sample as an ordered list of three nodes', () => {
    const { container } = render(<Pipeline />)
    const list = screen.getByRole('list', { name: 'Publish pipeline' })
    expect(list.tagName).toBe('OL')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByText('Figma file')).toBeInTheDocument()
    expect(within(items[0]!).getByText('14 changes')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Repository')).toBeInTheDocument()
    expect(within(items[1]!).getByText('bridge-ds-site · main')).toBeInTheDocument()
    expect(items[1]!.querySelector('[data-logo]')?.getAttribute('data-logo')).toBe('github')
    expect(within(items[2]!).getByText('Docs site')).toBeInTheDocument()
    expect(within(items[2]!).getByText('ds.bridge.design')).toBeInTheDocument()
    expect(items[2]!.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('url')
    expect(links(container)).toEqual([true, false])
  })
  it('exposes each node status accessibly', () => {
    render(<Pipeline />)
    expect(screen.getAllByRole('img', { name: 'Done' })).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
  })
  it('hides the rails from assistive tech', () => {
    const { container } = render(<Pipeline />)
    const rails = container.querySelectorAll('.bb-pipeline__rail')
    expect(rails).toHaveLength(2)
    rails.forEach((r) => expect(r.getAttribute('aria-hidden')).toBe('true'))
  })
  it('takes custom nodes, active links and label', () => {
    const { container } = render(
      <Pipeline
        aria-label="Release 2.6"
        activeLinks={[true, true]}
        nodes={[{ name: 'A', status: 'done' }, { name: 'B', status: 'error' }, { name: 'C', status: 'idle' }]}
      />,
    )
    expect(screen.getByRole('list', { name: 'Release 2.6' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Error' })).toBeInTheDocument()
    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(links(container)).toEqual([true, true])
  })
})
