import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TicketRow } from './TicketRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/TicketRow',
  component: TicketRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    state: { control: 'inline-radio', options: ['default', 'hover'] },
    issueType: { control: 'inline-radio', options: ['story', 'bug', 'task', 'epic', 'subtask'] },
    priority: { control: 'inline-radio', options: ['highest', 'high', 'medium', 'low', 'lowest'] },
    onSelect: { action: 'select' },
  },
  args: { state: 'default', selected: false },
} satisfies Meta<typeof TicketRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Default: Story = { parameters: v('State=Default') }
export const Hover: Story = { args: { state: 'hover' }, parameters: v('State=Hover') }
export const Selected: Story = { args: { selected: true }, parameters: v('State=Selected') }
export const BugDone: Story = {
  args: { issueKey: 'BB-97', issueType: 'bug', status: 'DONE', statusTone: 'success', priority: 'highest', points: '3', assignee: 'AK', title: 'Focus ring disappears on the dark brand' },
}
/** Figma "Show assignee" on (off by default). */
export const WithAssignee: Story = { args: { showAssignee: true, assigneeName: 'Praveen Manchi' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="420px">
      <TicketRow />
      <TicketRow selected />
    </BrandGrid>
  ),
}
