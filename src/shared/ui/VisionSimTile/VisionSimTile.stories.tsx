import type { Meta, StoryObj } from '@storybook/preact-vite'
import { VisionSimTile } from './VisionSimTile'
import { figma } from './figma'

const meta = {
  title: 'Molecules/VisionSimTile',
  component: VisionSimTile,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { simulation: 'normal', colors: { a: '#D93025', b: '#1E8E3E', bg: '#FFFFFF' } },
  decorators: [(Story) => <div style={{ width: '137px' }}><Story /></div>],
} satisfies Meta<typeof VisionSimTile>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Normal: Story = { parameters: v('Simulation=Normal') }
export const Protanopia: Story = { args: { simulation: 'protanopia' }, parameters: v('Simulation=Protanopia') }
export const Deuteranopia: Story = { args: { simulation: 'deuteranopia' }, parameters: v('Simulation=Deuteranopia') }
export const Tritanopia: Story = { args: { simulation: 'tritanopia' }, parameters: v('Simulation=Tritanopia') }
export const Achromatopsia: Story = { args: { simulation: 'achromatopsia' }, parameters: v('Simulation=Achromatopsia') }
export const LowVision: Story = { args: { simulation: 'low-vision' }, parameters: v('Simulation=Low vision') }
