import type { Meta, StoryObj } from '@storybook/preact-vite'
import { DropdownMenu } from './DropdownMenu'
import { MenuItem } from '../MenuItem/MenuItem'
import { figma } from './figma'

const meta = {
  title: 'Organisms/DropdownMenu',
  component: DropdownMenu,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ width: '260px' }}><Story /></div>],
} satisfies Meta<typeof DropdownMenu>
export default meta
type Story = StoryObj<typeof meta>

/** Matches the Figma master: Select all, divider, Color (selected), Typography, Spacing. */
export const Default: Story = {
  parameters: { figma: { variant: 'Dropdown menu' } },
  render: () => (
    <DropdownMenu aria-label="Sections">
      <MenuItem mode="multi" label="Select all" />
      <DropdownMenu.Divider />
      <MenuItem mode="multi" label="Color" count={12} selected />
      <MenuItem mode="multi" label="Typography" count={12} />
      <MenuItem mode="multi" label="Spacing" count={12} />
    </DropdownMenu>
  ),
}

export const SingleSelect: Story = {
  render: () => (
    <DropdownMenu aria-label="Pages">
      <MenuItem label="All pages" selected />
      <MenuItem label="Current page" />
      <MenuItem label="Selection" disabled />
    </DropdownMenu>
  ),
}
