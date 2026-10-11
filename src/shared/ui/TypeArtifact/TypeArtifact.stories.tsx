import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TypeArtifact } from './TypeArtifact'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/TypeArtifact',
  component: TypeArtifact,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { onOpen: () => undefined },
} satisfies Meta<typeof TypeArtifact>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Type Artifact' } } }
export const TwoLevels: Story = { args: { levels: [{ level: 'label', sample: 'Section title' }, { level: 'caption', sample: 'Helper text' }] } }

export const AcrossBrands: Story = {
  render: (args) => <BrandGrid width="600px"><TypeArtifact {...args} /></BrandGrid>,
}
