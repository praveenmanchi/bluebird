import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ReadinessMeter } from './ReadinessMeter'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The MCP tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-mcp-surface-panel)', padding: 'var(--bb-mcp-space-panel)' }

const meta = {
  title: 'Molecules/ReadinessMeter',
  component: ReadinessMeter,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: {
    tone: { control: 'inline-radio', options: ['success', 'warning', 'danger'] },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  args: { tone: 'success' },
} satisfies Meta<typeof ReadinessMeter>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Success: Story = { parameters: v('Tone=Success') }
export const Warning: Story = { args: { tone: 'warning' }, parameters: v('Tone=Warning') }
export const Danger: Story = { args: { tone: 'danger' }, parameters: v('Tone=Danger') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-mcp-space-section)' }}>
        <ReadinessMeter tone="success" />
        <ReadinessMeter tone="warning" />
        <ReadinessMeter tone="danger" />
      </div>
    </BrandGrid>
  ),
}
