import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SizeStep } from './SizeStep'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/SizeStep',
  component: SizeStep,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { label: 'L', selected: false },
} satisfies Meta<typeof SizeStep>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Default: Story = { parameters: v('State=Default') }
export const Active: Story = { args: { selected: true }, parameters: v('State=active') }

/** A typical S / M / L step row with the current size filled. */
export const StepRow: Story = {
  render: () => (
    <div style={{ display: 'inline-flex', gap: 'var(--bb-space-inline-xs)', padding: 'var(--bb-space-inset-sm)', background: 'var(--bb-surface-sunken)' }}>
      <SizeStep label="S" />
      <SizeStep label="M" />
      <SizeStep label="L" selected />
    </div>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <div style={{ display: 'inline-flex', gap: 'var(--bb-space-inline-xs)' }}>
        <SizeStep {...args} />
        <SizeStep {...args} selected />
      </div>
    </BrandGrid>
  ),
}
