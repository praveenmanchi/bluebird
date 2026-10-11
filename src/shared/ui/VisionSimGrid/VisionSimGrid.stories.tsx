import type { Meta, StoryObj } from '@storybook/preact-vite'
import { VisionSimGrid } from './VisionSimGrid'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/VisionSimGrid',
  component: VisionSimGrid,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { colors: { a: '#D93025', b: '#1E8E3E', bg: '#FFFFFF' } },
  decorators: [(Story) => <div style={{ width: '437px' }}><Story /></div>],
} satisfies Meta<typeof VisionSimGrid>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Vision Sim Grid' } } }
export const BlueOrange: Story = { args: { colors: { a: '#1A73E8', b: '#E8710A', bg: '#FFFFFF' }, labels: ['Info', 'Warning'] } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><VisionSimGrid {...args} /></BrandGrid> }
