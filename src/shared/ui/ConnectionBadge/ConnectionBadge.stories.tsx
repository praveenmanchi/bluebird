import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ConnectionBadge } from './ConnectionBadge'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ConnectionBadge',
  component: ConnectionBadge,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { status: { control: 'inline-radio', options: ['retry', 'good', 'error'] } },
  args: { status: 'retry' },
} satisfies Meta<typeof ConnectionBadge>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Default: Story = { parameters: v('Property 1=Default') }
export const Variant2: Story = { args: { status: 'good' }, parameters: v('Property 1=Variant2') }
export const Variant3: Story = { args: { status: 'error' }, parameters: v('Property 1=Variant3') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-space-inline-sm)' }}>
        <ConnectionBadge status="retry" />
        <ConnectionBadge status="good" />
        <ConnectionBadge status="error" />
      </div>
    </BrandGrid>
  ),
}
