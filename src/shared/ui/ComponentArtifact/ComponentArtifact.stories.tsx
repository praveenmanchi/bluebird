import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ComponentArtifact } from './ComponentArtifact'
import { figma } from './figma'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/ComponentArtifact',
  component: ComponentArtifact,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { onOpen: () => undefined },
} satisfies Meta<typeof ComponentArtifact>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Component Artifact' } } }
export const CustomPreview: Story = {
  args: {
    title: 'Meta Badge',
    subtitle: 'Atom · Components page · 5 variants · 4 properties',
    properties: ['Tone', 'Label', 'Meta', 'Show meta'],
    code: 'src/shared/ui/MetaBadge · Code Connect ✓',
    children: (
      <>
        <MetaBadge tone="neutral">Neutral</MetaBadge>
        <MetaBadge tone="accent">Accent</MetaBadge>
        <MetaBadge tone="success">Success</MetaBadge>
      </>
    ),
  },
}

export const AcrossBrands: Story = {
  render: (args) => <BrandGrid width="600px"><ComponentArtifact {...args} /></BrandGrid>,
}
