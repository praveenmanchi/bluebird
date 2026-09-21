import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SectionHeader } from './SectionHeader'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const DESCRIPTION = 'When enabled, the Extract tab will compare your local variables.json against the one stored on GitHub before creating a PR.'

const meta = {
  title: 'Molecules/SectionHeader',
  component: SectionHeader,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { logo: { control: 'select', options: [undefined, 'github', 'storybook', 'teams', 'zeroheight'] } },
  args: { title: 'Label Title', description: DESCRIPTION, logo: 'github' },
} satisfies Meta<typeof SectionHeader>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant: Logo=on, Title2=on, Toggle=off. */
export const SettingsPageTitle: Story = { parameters: { figma: { variant: 'settings page title' } } }

export const WithToggle: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true)
    return <SectionHeader {...args} toggle checked={checked} onToggle={setChecked} />
  },
}
export const NoLogo: Story = { args: { logo: undefined } }
export const DescriptionOnly: Story = { args: { title: undefined, logo: undefined } }

/** Logo × Toggle booleans. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Toggle off', 'Toggle on']} rows={['github', 'storybook', 'teams', 'zeroheight']}>
      {(row, col) => <SectionHeader {...args} logo={row as 'github' | 'storybook' | 'teams' | 'zeroheight'} toggle={col === 'Toggle on'} checked />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="360px">
      <SectionHeader {...args} />
      <SectionHeader {...args} logo="storybook" toggle checked />
    </BrandGrid>
  ),
}
