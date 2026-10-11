import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BreakdownCard } from './BreakdownCard'
import { figma } from './figma'

const meta = {
  title: 'Molecules/BreakdownCard',
  component: BreakdownCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    title: 'By principle',
    rows: [
      { tone: 'perceivable', label: 'Perceivable', value: '19' },
      { tone: 'operable', label: 'Operable', value: '4' },
      { tone: 'understandable', label: 'Understandable', value: '0' },
      { tone: 'robust', label: 'Robust', value: '0' },
    ],
  },
  decorators: [(Story) => <div style={{ width: '265px' }}><Story /></div>],
} satisfies Meta<typeof BreakdownCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Breakdown Card' } } }
export const BySeverity: Story = {
  args: {
    title: 'By severity',
    rows: [
      { tone: 'critical', label: 'Critical', value: '9' },
      { tone: 'serious', label: 'Serious', value: '8' },
      { tone: 'moderate', label: 'Moderate', value: '4' },
      { tone: 'minor', label: 'Minor', value: '2' },
    ],
  },
}
