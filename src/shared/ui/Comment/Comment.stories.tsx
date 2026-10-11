import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Comment } from './Comment'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Comment',
  component: Comment,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { onReply: { action: 'reply' }, onEdit: { action: 'edit' }, onDelete: { action: 'delete' } },
  args: { showActions: true },
} satisfies Meta<typeof Comment>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Comment' } } }
export const WithoutActions: Story = { args: { showActions: false, author: 'Praveen Manchi', initials: 'PM', time: 'just now', children: 'Attached the Ikea hover frame.' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="380px">
      <Comment />
    </BrandGrid>
  ),
}
