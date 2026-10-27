import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TeamBanner } from './TeamBanner'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/TeamBanner',
  component: TeamBanner,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { org: 'HCL', team: 'Design System', version: '1.3.3', updated: '28 Oct 2026', showProduct: true },
} satisfies Meta<typeof TeamBanner>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant. */
export const Default: Story = { parameters: { figma: { variant: 'team Banner' } } }

/** The Settings Layout instance: tagline overridden to 24 (UX copy 335:8011, 576 wide). */
export const SettingsInstance: Story = { args: { taglineSize: 'lg' }, render: (args) => <div style={{ width: 'calc(var(--bb-derived-team-banner-root-width) - var(--bb-dimension-space-12) * 2)' }}><TeamBanner {...args} style={{ width: '100%' }} /></div> }

export const WithoutProduct: Story = { args: { showProduct: false } }

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
