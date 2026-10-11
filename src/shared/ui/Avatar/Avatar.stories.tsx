import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Avatar } from './Avatar'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] } },
  args: { size: 'sm', children: 'PM' },
} satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Small: Story = { parameters: v('Size=Small') }
export const Medium: Story = { args: { size: 'md' }, parameters: v('Size=Medium') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-jira-space-inline)', alignItems: 'center' }}>
        <Avatar>PM</Avatar>
        <Avatar size="md" name="Anika Kumar">AK</Avatar>
      </div>
    </BrandGrid>
  ),
}
