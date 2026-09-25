import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { CodeSnippet } from './CodeSnippet'

describe('CodeSnippet', () => {
  it('shows the language caption and the code', () => {
    const { container } = render(<CodeSnippet language="CSS" code="color: var(--x);" />)
    expect(screen.getByText('CSS')).toBeInTheDocument()
    expect(container.querySelector('.bb-code-snippet__code')?.textContent).toBe('color: var(--x);')
  })
  it('defaults the caption to "Code"', () => {
    render(<CodeSnippet code="x" />)
    expect(screen.getByText('Code')).toBeInTheDocument()
  })
  it('gives the copy action an accessible name and fires onCopy', () => {
    const calls: string[] = []
    render(<CodeSnippet code="x" onCopy={() => calls.push('copy')} />)
    screen.getByRole('button', { name: 'Copy snippet' }).click()
    expect(calls).toEqual(['copy'])
  })
})
