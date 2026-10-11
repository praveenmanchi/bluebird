import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Stepper } from './Stepper'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The MCP tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-mcp-surface-panel)', padding: 'var(--bb-mcp-space-panel)' }

const meta = {
  title: 'Molecules/Stepper',
  component: Stepper,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { current: { control: { type: 'range', min: 0, max: 4, step: 1 } } },
  args: { current: 2 },
} satisfies Meta<typeof Stepper>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Stepper' } } }
export const FirstStep: Story = { args: { current: 0 } }
export const AllDone: Story = { args: { current: 4 } }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="460px">
      <div style={panel}><Stepper current={2} /></div>
    </BrandGrid>
  ),
}
