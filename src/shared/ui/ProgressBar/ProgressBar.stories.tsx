import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ProgressBar } from './ProgressBar'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The MCP tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-mcp-surface-panel)', padding: 'var(--bb-mcp-space-panel)' }

const meta = {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: {
    tone: { control: 'inline-radio', options: ['success', 'warning', 'danger'] },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  args: { tone: 'success', value: 92, 'aria-label': 'Handoff readiness' },
} satisfies Meta<typeof ProgressBar>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Success92: Story = { parameters: v('Tone=Success, Value=92') }
export const Warning70: Story = { args: { tone: 'warning', value: 70 }, parameters: v('Tone=Warning, Value=70') }
export const Danger58: Story = { args: { tone: 'danger', value: 58 }, parameters: v('Tone=Danger, Value=58') }
export const Success25: Story = { args: { value: 25 }, parameters: v('Tone=Success, Value=25') }
export const Success50: Story = { args: { value: 50 }, parameters: v('Tone=Success, Value=50') }
export const Success64: Story = { args: { value: 64 }, parameters: v('Tone=Success, Value=64') }
export const Success75: Story = { args: { value: 75 }, parameters: v('Tone=Success, Value=75') }
export const Success100: Story = { args: { value: 100 }, parameters: v('Tone=Success, Value=100') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="340px">
      <div style={panel}><ProgressBar tone="success" value={92} aria-label="Success" /></div>
      <div style={panel}><ProgressBar tone="warning" value={70} aria-label="Warning" /></div>
      <div style={panel}><ProgressBar tone="danger" value={58} aria-label="Danger" /></div>
    </BrandGrid>
  ),
}
