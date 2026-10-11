import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BrandCount } from './BrandCount'
import { figma } from './figma'

const meta = {
  title: 'Atoms/BrandCount',
  component: BrandCount,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { brand: 'Bridge', count: 3 },
  decorators: [(Story) => <div style={{ width: '100px' }}><Story /></div>],
} satisfies Meta<typeof BrandCount>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Success: Story = { parameters: v('Tone=Success') }
export const Warning: Story = { args: { count: 6 }, parameters: v('Tone=Warning') }
export const Danger: Story = { args: { count: 12 }, parameters: v('Tone=Danger') }
export const Empty: Story = { args: { count: null }, parameters: v('Tone=Empty') }
