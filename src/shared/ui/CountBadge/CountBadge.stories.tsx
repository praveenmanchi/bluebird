import type { Meta, StoryObj } from '@storybook/preact-vite'
import { CountBadge } from './CountBadge'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/CountBadge',
  component: CountBadge,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { label: 'Effected Components', count: 52 },
} satisfies Meta<typeof CountBadge>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Frame 1430102586' } } }
/** Mirrors the alias set "Frame 1430102563" (83:746). */
export const WithIcon: Story = { args: { label: 'Effected Brand', count: 'ON', icon: true } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <CountBadge {...args} />
      <CountBadge {...args} label="Effected Brand" count="ON" icon />
    </BrandGrid>
  ),
}
