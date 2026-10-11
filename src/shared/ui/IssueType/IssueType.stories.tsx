import type { Meta, StoryObj } from '@storybook/preact-vite'
import { IssueType } from './IssueType'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/IssueType',
  component: IssueType,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { type: { control: 'inline-radio', options: ['story', 'bug', 'task', 'epic', 'subtask'] } },
  args: { type: 'story' },
} satisfies Meta<typeof IssueType>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const StoryType: Story = { name: 'Story', parameters: v('Type=Story') }
export const Bug: Story = { args: { type: 'bug' }, parameters: v('Type=Bug') }
export const Task: Story = { args: { type: 'task' }, parameters: v('Type=Task') }
export const Epic: Story = { args: { type: 'epic' }, parameters: v('Type=Epic') }
export const Subtask: Story = { args: { type: 'subtask' }, parameters: v('Type=Subtask') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-jira-space-inline)' }}>
        <IssueType type="story" />
        <IssueType type="bug" />
        <IssueType type="task" />
        <IssueType type="epic" />
        <IssueType type="subtask" />
      </div>
    </BrandGrid>
  ),
}
