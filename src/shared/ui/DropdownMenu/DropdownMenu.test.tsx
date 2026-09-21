import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { DropdownMenu } from './DropdownMenu'
import { MenuItem } from '../MenuItem/MenuItem'

describe('DropdownMenu', () => {
  it('is a listbox containing options and a divider', () => {
    const { container } = render(
      <DropdownMenu aria-label="Sections">
        <MenuItem mode="multi" label="Select all" />
        <DropdownMenu.Divider />
        <MenuItem mode="multi" label="Color" count={12} selected />
      </DropdownMenu>,
    )
    expect(screen.getByRole('listbox', { name: 'Sections' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(container.querySelector('.bb-dropdown-menu__divider')).not.toBeNull()
  })
})
