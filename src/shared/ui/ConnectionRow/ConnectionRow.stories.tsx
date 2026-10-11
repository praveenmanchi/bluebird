import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ConnectionRow } from './ConnectionRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The MCP tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-mcp-surface-panel)', padding: 'var(--bb-mcp-space-panel)' }

const meta = {
  title: 'Molecules/ConnectionRow',
  component: ConnectionRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { status: { control: 'inline-radio', options: ['good', 'issue', 'error'] } },
  args: { showAction: true },
} satisfies Meta<typeof ConnectionRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Connection Row' } } }
export const WithoutAction: Story = { args: { showAction: false } }
export const Disconnected: Story = { args: { status: 'error', detail: 'Local · 127.0.0.1:3845 unreachable', actionLabel: 'Retry' } }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={panel}><ConnectionRow /></div>
    </BrandGrid>
  ),
}
