import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ArtifactHeader } from './ArtifactHeader'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/ArtifactHeader',
  component: ArtifactHeader,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { onOpen: () => undefined },
} satisfies Meta<typeof ArtifactHeader>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Artifact Header' } } }
export const Component: Story = {
  args: { icon: 'component', title: 'Button', subtitle: 'Atom · Components page · 12 variants · 8 properties', actionLabel: 'Go to component' },
}

export const AcrossBrands: Story = {
  render: (args) => <BrandGrid width="560px"><ArtifactHeader {...args} /></BrandGrid>,
}
