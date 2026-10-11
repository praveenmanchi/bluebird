import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PipelineNode } from './PipelineNode'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/PipelineNode',
  component: PipelineNode,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { status: { control: 'inline-radio', options: ['done', 'running', 'error', 'idle'] } },
  args: { status: 'done' },
} satisfies Meta<typeof PipelineNode>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Done: Story = { parameters: v('Status=Done') }
export const Running: Story = { args: { status: 'running' }, parameters: v('Status=Running') }
export const ErrorState: Story = { args: { status: 'error' }, parameters: v('Status=Error') }
export const Idle: Story = { args: { status: 'idle' }, parameters: v('Status=Idle') }
export const WithLogo: Story = { args: { name: 'Repository', meta: 'bridge-ds-site · main', logo: 'github' } }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={{ ...panel, display: 'flex', gap: 'var(--bb-publish-space-section)', flexWrap: 'wrap' }}>
        <PipelineNode status="done" />
        <PipelineNode status="running" />
        <PipelineNode status="error" />
        <PipelineNode status="idle" />
      </div>
    </BrandGrid>
  ),
}
