import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ReleaseRow } from './ReleaseRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/ReleaseRow',
  component: ReleaseRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { status: { control: 'inline-radio', options: ['live', 'building', 'failed'] } },
  args: { status: 'live' },
} satisfies Meta<typeof ReleaseRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Live: Story = { parameters: v('Status=Live') }
export const Building: Story = { args: { status: 'building' }, parameters: v('Status=Building') }
export const Failed: Story = { args: { status: 'failed' }, parameters: v('Status=Failed') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <ul style={{ ...panel, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-tight)' }}>
        <li><ReleaseRow status="building" version="v2.6.0" summary="Tokens for the Publish tab" meta="Praveen · 11 Oct · 8 changes" /></li>
        <li><ReleaseRow status="live" /></li>
        <li><ReleaseRow status="failed" version="v2.4.1" summary="Icon fixes" meta="Praveen · 2 Oct · 3 changes" /></li>
      </ul>
    </BrandGrid>
  ),
}
