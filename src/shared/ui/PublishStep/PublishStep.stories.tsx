import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PublishStep } from './PublishStep'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/PublishStep',
  component: PublishStep,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { status: { control: 'inline-radio', options: ['done', 'running', 'queued', 'failed'] } },
  args: { status: 'done' },
} satisfies Meta<typeof PublishStep>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Done: Story = { parameters: v('Status=Done') }
export const Running: Story = { args: { status: 'running' }, parameters: v('Status=Running') }
export const Queued: Story = { args: { status: 'queued' }, parameters: v('Status=Queued') }
export const Failed: Story = { args: { status: 'failed' }, parameters: v('Status=Failed') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <ol style={{ ...panel, margin: 0, listStyle: 'none' }}>
        <li><PublishStep status="done" /></li>
        <li><PublishStep status="running" title="Build docs site" detail="vite build · 214 pages" time="31s" /></li>
        <li><PublishStep status="queued" title="Deploy" detail="ds.bridge.design" time="—" /></li>
        <li><PublishStep status="failed" title="Notify Teams" detail="Webhook returned 403" time="1s" /></li>
      </ol>
    </BrandGrid>
  ),
}
