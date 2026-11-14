import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { FilterDropdown } from './FilterDropdown'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/FilterDropdown',
  component: FilterDropdown,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { state: { control: 'inline-radio', options: ['default', 'hover', 'focus'] } },
  args: { children: 'Component', icon: true },
} satisfies Meta<typeof FilterDropdown>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Property 1=Default' } } }
export const Focus: Story = { args: { state: 'focus' }, parameters: { figma: { variant: 'Property 1=Focus' } } }
export const NoIcon: Story = { args: { icon: false } }
export const Hover: Story = { args: { state: 'hover' } }
export const Open: Story = { args: { open: true } }
export const Disabled: Story = { args: { disabled: true } }

export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false)
    return <FilterDropdown {...args} open={open} onClick={() => setOpen((o) => !o)} />
  },
}

/** Icon × state. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Focus', 'Open']} rows={['Icon', 'No icon']}>
      {(row, col) => <FilterDropdown {...args} icon={row === 'Icon'} state={col === 'Hover' ? 'hover' : col === 'Focus' ? 'focus' : undefined} open={col === 'Open'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <FilterDropdown {...args} />
      <FilterDropdown {...args} icon={false}>Page</FilterDropdown>
      <FilterDropdown {...args} open />
    </BrandGrid>
  ),
}
