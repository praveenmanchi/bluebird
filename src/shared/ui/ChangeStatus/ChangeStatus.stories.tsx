import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ChangeStatus } from './ChangeStatus'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ChangeStatus',
  component: ChangeStatus,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { status: { control: 'inline-radio', options: ['updated', 'added', 'removed'] } },
  args: { status: 'updated', count: 52 },
} satisfies Meta<typeof ChangeStatus>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Default: Story = { parameters: v('Property 1=Default') }
export const Variant2: Story = { args: { status: 'added' }, parameters: v('Property 1=Variant2') }
export const Variant3: Story = { args: { status: 'removed' }, parameters: v('Property 1=Variant3') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <ChangeStatus status="updated" count={52} />
      <ChangeStatus status="added" count={12} />
      <ChangeStatus status="removed" count={3} />
    </BrandGrid>
  ),
}
