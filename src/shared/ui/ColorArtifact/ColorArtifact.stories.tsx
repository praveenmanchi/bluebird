import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ColorArtifact } from './ColorArtifact'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/ColorArtifact',
  component: ColorArtifact,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { onOpen: () => undefined },
} satisfies Meta<typeof ColorArtifact>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Color Artifact' } } }
export const OtherVariable: Story = {
  args: {
    variable: 'text/primary',
    subtitle: 'Colour variable · Brand UI · used in 120 layers',
    chain: ['text/primary', 'bridge/color/neutral/0'],
    usage: [{ label: 'Body copy' }, { label: 'AAA 15.3:1 on canvas', tone: 'success' }],
  },
}

export const AcrossBrands: Story = {
  render: (args) => <BrandGrid width="600px"><ColorArtifact {...args} /></BrandGrid>,
}
