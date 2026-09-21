import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Chip } from './Chip'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Chip',
  component: Chip,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { children: 'Label', showIcon: true, icon: 'variables' },
} satisfies Meta<typeof Chip>
export default meta
type Story = StoryObj<typeof meta>

export const Filters: Story = { parameters: { figma: { variant: 'Filiters' } } }
export const WithoutIcon: Story = { args: { showIcon: false } }
export const Selected: Story = { args: { selected: true } }

export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Selected', 'Disabled']} rows={['Icon', 'No icon']}>
      {(row, col) => <Chip {...args} showIcon={row === 'Icon'} state={col === 'Hover' ? 'hover' : undefined} selected={col === 'Selected'} disabled={col === 'Disabled'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <Chip {...args} />
      <Chip {...args} selected />
      <Chip {...args} showIcon={false} />
    </BrandGrid>
  ),
}
