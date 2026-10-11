import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LevelRow } from './LevelRow'
import { figma } from './figma'

const meta = {
  title: 'Molecules/LevelRow',
  component: LevelRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { name: 'Atoms', hint: 'Buttons, inputs, badges, icons', passing: 15, total: 18 },
  decorators: [(Story) => <div style={{ width: '542px' }}><Story /></div>],
} satisfies Meta<typeof LevelRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Success: Story = { parameters: v('Tone=Success') }
export const Warning: Story = { args: { name: 'Molecules', hint: 'Fields, dropdowns, list rows', passing: 8, total: 12 }, parameters: v('Tone=Warning') }
export const Danger: Story = { args: { name: 'Organisms', hint: 'Banner, cards, footer, toolbar', passing: 3, total: 8 }, parameters: v('Tone=Danger') }
export const Empty: Story = { args: { passing: null }, parameters: v('Tone=Empty') }
