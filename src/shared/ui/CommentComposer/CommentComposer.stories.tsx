import type { Meta, StoryObj } from '@storybook/preact-vite'
import { CommentComposer } from './CommentComposer'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/CommentComposer',
  component: CommentComposer,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    onSubmit: { action: 'submit' },
    onCancel: { action: 'cancel' },
    onAttachLink: { action: 'attach link' },
    onAttachFile: { action: 'attach file' },
  },
} satisfies Meta<typeof CommentComposer>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Comment Composer' } } }
export const WithDraft: Story = { args: { defaultValue: '@Anika attached the Ikea hover frame — focus ring uses border/focus.' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="420px">
      <CommentComposer />
    </BrandGrid>
  ),
}
