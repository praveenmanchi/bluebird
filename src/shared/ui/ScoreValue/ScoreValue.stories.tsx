import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ScoreValue } from './ScoreValue'
import { figma } from './figma'

const meta = {
  title: 'Atoms/ScoreValue',
  component: ScoreValue,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { value: 92 },
} satisfies Meta<typeof ScoreValue>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Success: Story = { parameters: v('Tone=Success') }
export const Warning: Story = { args: { value: 68 }, parameters: v('Tone=Warning') }
export const Danger: Story = { args: { value: 41 }, parameters: v('Tone=Danger') }
export const Empty: Story = { args: { value: null }, parameters: v('Tone=Empty') }
