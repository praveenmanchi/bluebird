import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BreakdownRow } from './BreakdownRow'
import { figma } from './figma'

const meta = {
  title: 'Molecules/BreakdownRow',
  component: BreakdownRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { tone: 'perceivable', label: 'Perceivable', value: '19' },
  decorators: [(Story) => <div style={{ width: '240px' }}><Story /></div>],
} satisfies Meta<typeof BreakdownRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Breakdown Row' } } }
export const Severity: Story = { args: { tone: 'critical', label: 'Critical', value: '9' } }
