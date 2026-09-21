import type { Meta, StoryObj } from '@storybook/preact-vite'
import { MenuItem } from './MenuItem'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/MenuItem',
  component: MenuItem,
  parameters: { figma: { setId: figma.setId, name: figma.name }, layout: 'padded' },
  argTypes: { mode: { control: 'inline-radio', options: ['single', 'multi'] } },
  args: { label: 'Menu item', count: 12, mode: 'single' },
  decorators: [(Story) => <div style={{ width: '240px' }}><Story /></div>],
} satisfies Meta<typeof MenuItem>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const SingleDefault: Story = { parameters: v('Mode=Single, State=Default') }
export const SingleHover: Story = { args: { state: 'hover' }, parameters: v('Mode=Single, State=Hover') }
export const SingleSelected: Story = { args: { selected: true }, parameters: v('Mode=Single, State=Selected') }
export const SingleDisabled: Story = { args: { disabled: true }, parameters: v('Mode=Single, State=Disabled') }
export const MultiDefault: Story = { args: { mode: 'multi' }, parameters: v('Mode=Multi, State=Default') }
export const MultiHover: Story = { args: { mode: 'multi', state: 'hover' }, parameters: v('Mode=Multi, State=Hover') }
export const MultiSelected: Story = { args: { mode: 'multi', selected: true }, parameters: v('Mode=Multi, State=Selected') }
export const MultiDisabled: Story = { args: { mode: 'multi', disabled: true }, parameters: v('Mode=Multi, State=Disabled') }

export const Matrix: Story = {
  decorators: [],
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Selected', 'Disabled']} rows={['Single', 'Multi']}>
      {(row, col) => (
        <div style={{ width: '240px' }}>
          <MenuItem {...args} mode={row.toLowerCase() as 'single' | 'multi'} state={col === 'Hover' ? 'hover' : undefined} selected={col === 'Selected'} disabled={col === 'Disabled'} />
        </div>
      )}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  decorators: [],
  render: (args) => (
    <BrandGrid>
      <MenuItem {...args} />
      <MenuItem {...args} selected />
      <MenuItem {...args} mode="multi" selected />
      <MenuItem {...args} disabled />
    </BrandGrid>
  ),
}
