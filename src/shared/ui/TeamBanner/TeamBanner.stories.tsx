import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TeamBanner } from './TeamBanner'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/TeamBanner',
  component: TeamBanner,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { team: 'Gap Design System', version: '1.3.3', showFabric: true },
} satisfies Meta<typeof TeamBanner>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant. */
export const Default: Story = { parameters: { figma: { variant: 'team Banner' } } }

export const WithoutFabric: Story = { args: { showFabric: false } }

export const CustomSlot: Story = {
  render: (args) => (
    <TeamBanner {...args}>
      <span>Release notes are in the Change log tab.</span>
    </TeamBanner>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="640px">
      <TeamBanner {...args} />
    </BrandGrid>
  ),
}
