import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Pipeline } from './Pipeline'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints this on its dark panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/Pipeline',
  component: Pipeline,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
} satisfies Meta<typeof Pipeline>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Pipeline' } } }
export const Failed: Story = {
  args: {
    nodes: [
      { name: 'Figma file', meta: '14 changes', status: 'done', icon: 'layers' },
      { name: 'Repository', meta: 'Push rejected', status: 'error', logo: 'github' },
      { name: 'Docs site', meta: 'ds.bridge.design', status: 'idle', icon: 'url' },
    ],
    activeLinks: [true, false],
  },
}
export const Complete: Story = {
  args: {
    nodes: [
      { name: 'Figma file', meta: '14 changes', status: 'done', icon: 'layers' },
      { name: 'Repository', meta: 'bridge-ds-site · main', status: 'done', logo: 'github' },
      { name: 'Docs site', meta: 'ds.bridge.design', status: 'done', icon: 'url' },
    ],
    activeLinks: [true, true],
  },
}

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={panel}><Pipeline /></div>
    </BrandGrid>
  ),
}
