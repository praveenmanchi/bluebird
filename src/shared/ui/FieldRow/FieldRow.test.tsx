import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { FieldRow } from './FieldRow'

describe('FieldRow', () => {
  it('renders the Figma default label, value and avatar', () => {
    const { container } = render(<FieldRow />)
    expect(screen.getByText('Assignee')).toBeInTheDocument()
    expect(screen.getByText('Praveen Manchi')).toBeInTheDocument()
    expect(container.querySelector('.bb-avatar')).not.toBeNull()
  })
  it('hides the avatar when Show avatar is off', () => {
    const { container } = render(<FieldRow label="Sprint" showAvatar={false}>Bluebird 14</FieldRow>)
    expect(container.querySelector('.bb-avatar')).toBeNull()
    expect(screen.getByText('Bluebird 14')).toBeInTheDocument()
  })
  it('passes initials to the nested avatar', () => {
    render(<FieldRow initials="AK">Anika Kumar</FieldRow>)
    expect(screen.getByText('AK').closest('.bb-avatar')).not.toBeNull()
  })
})
