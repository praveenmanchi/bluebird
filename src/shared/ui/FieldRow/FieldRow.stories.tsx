import type { Meta, StoryObj } from '@storybook/preact-vite'
import { FieldRow } from './FieldRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/FieldRow',
  component: FieldRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { label: 'Assignee', children: 'Praveen Manchi', showAvatar: true },
} satisfies Meta<typeof FieldRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Field Row' } } }
export const WithoutAvatar: Story = { args: { label: 'Sprint', children: 'Bluebird 14', showAvatar: false } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="380px">
      <FieldRow />
      <FieldRow label="Status" showAvatar={false}>In progress</FieldRow>
    </BrandGrid>
  ),
}
