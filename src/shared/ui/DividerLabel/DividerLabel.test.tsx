import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { DividerLabel } from './DividerLabel'

describe('DividerLabel', () => {
  it('renders the Figma default caption as a separator', () => {
    render(<DividerLabel />)
    expect(screen.getByRole('separator')).toHaveTextContent('Other ways to sign in')
  })
  it('takes a custom label', () => {
    render(<DividerLabel>Can’t use SSO?</DividerLabel>)
    expect(screen.getByRole('separator')).toHaveTextContent('Can’t use SSO?')
  })
})
