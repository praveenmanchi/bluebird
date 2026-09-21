import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SegmentTab } from './SegmentTab'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SegmentTab',
  component: SegmentTab,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { icon: { control: 'select', options: [undefined, 'text', 'file', 'variables'] } },
  args: { children: 'Label', icon: 'text' },
} satisfies Meta<typeof SegmentTab>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'JSON' }, parameters: { figma: { variant: 'Property 1=Default' } } }
export const Selected: Story = { args: { selected: true }, parameters: { figma: { variant: 'Property 1=Selected' } } }
export const Hover: Story = { args: { state: 'hover' } }
export const TextOnly: Story = { args: { icon: undefined } }

/** Property 1 × icon. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Icon', 'Text only']} rows={['Default', 'Selected']}>
      {(row, col) => <SegmentTab {...args} selected={row === 'Selected'} icon={col === 'Icon' ? 'text' : undefined} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <SegmentTab {...args}>JSON</SegmentTab>
      <SegmentTab {...args} selected />
    </BrandGrid>
  ),
}
