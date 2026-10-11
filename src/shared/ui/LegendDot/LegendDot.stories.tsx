import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LegendDot } from './LegendDot'
import { figma } from './figma'

const meta = {
  title: 'Atoms/LegendDot',
  component: LegendDot,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { tone: 'perceivable' },
} satisfies Meta<typeof LegendDot>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Perceivable: Story = { parameters: v('Tone=Perceivable') }
export const Operable: Story = { args: { tone: 'operable' }, parameters: v('Tone=Operable') }
export const Understandable: Story = { args: { tone: 'understandable' }, parameters: v('Tone=Understandable') }
export const Robust: Story = { args: { tone: 'robust' }, parameters: v('Tone=Robust') }
export const Critical: Story = { args: { tone: 'critical' }, parameters: v('Tone=Critical') }
export const Serious: Story = { args: { tone: 'serious' }, parameters: v('Tone=Serious') }
export const Moderate: Story = { args: { tone: 'moderate' }, parameters: v('Tone=Moderate') }
export const Minor: Story = { args: { tone: 'minor' }, parameters: v('Tone=Minor') }
