import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Banner } from './Banner'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/Banner',
  component: Banner,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { showPoweredBy: true },
  decorators: [(Story) => <div style={{ width: 'var(--bb-derived-banner-root-width)' }}><Story /></div>],
} satisfies Meta<typeof Banner>
export default meta
type Story = StoryObj<typeof meta>

/** The Figma master at its 632px frame width. */
export const Default: Story = {
  args: {
    showPoweredBy: false
  },

  parameters: { figma: { variant: 'Banner' } }
}
export const WithoutPoweredBy: Story = { args: { showPoweredBy: false } }
/** How it renders at the plugin's 400px window. */
export const PluginWidth: Story = { decorators: [(Story) => <div style={{ width: '400px' }}><Story /></div>] }

export const AcrossBrands: Story = {
  args: {
    showPoweredBy: false
  },

  decorators: [],

  render: (args) => (
    <BrandGrid width="632px">
      <Banner {...args} />
    </BrandGrid>
  )
}
