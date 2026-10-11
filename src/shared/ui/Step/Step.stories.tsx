import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Step } from './Step'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The MCP tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-mcp-surface-panel)', padding: 'var(--bb-mcp-space-panel)' }

const meta = {
  title: 'Atoms/Step',
  component: Step,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { state: { control: 'inline-radio', options: ['done', 'current', 'upcoming'] } },
  args: { state: 'done', number: '1', label: 'Select' },
} satisfies Meta<typeof Step>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Done: Story = { parameters: v('State=Done') }
export const Current: Story = { args: { state: 'current' }, parameters: v('State=Current') }
export const Upcoming: Story = { args: { state: 'upcoming' }, parameters: v('State=Upcoming') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="220px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-mcp-space-section)' }}>
        <Step state="done" number="1" label="Select" />
        <Step state="current" number="2" label="Check" />
        <Step state="upcoming" number="3" label="Generate" />
      </div>
    </BrandGrid>
  ),
}
