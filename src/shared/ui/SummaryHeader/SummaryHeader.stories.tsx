import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SummaryHeader } from './SummaryHeader'
import { figma } from './figma'

const meta = {
  title: 'Molecules/SummaryHeader',
  component: SummaryHeader,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { stats: '3,412 nodes · 840 ms', status: { tone: 'danger', label: '9 fail AA' }, onToggle: () => undefined },
  decorators: [(Story) => <div style={{ width: '542px' }}><Story /></div>],
} satisfies Meta<typeof SummaryHeader>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Summary Header' } } }
export const Expanded: Story = { args: { expanded: true } }
