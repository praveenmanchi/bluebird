import type { Meta, StoryObj } from '@storybook/preact-vite'
import { DisclosureToggle } from './DisclosureToggle'
import { figma } from './figma'

const meta = {
  title: 'Atoms/DisclosureToggle',
  component: DisclosureToggle,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { expanded: false },
} satisfies Meta<typeof DisclosureToggle>
export default meta
type Story = StoryObj<typeof meta>

export const Collapsed: Story = { parameters: { figma: { variant: 'Expanded=No' } } }
export const Expanded: Story = { args: { expanded: true }, parameters: { figma: { variant: 'Expanded=Yes' } } }
