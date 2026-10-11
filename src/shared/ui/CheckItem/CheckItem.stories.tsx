import type { Meta, StoryObj } from '@storybook/preact-vite'
import { CheckItem } from './CheckItem'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The MCP tab paints these on its dark panel surface. */
const panel = { background: 'var(--bb-mcp-surface-panel)', padding: 'var(--bb-mcp-space-panel)' }

const meta = {
  title: 'Molecules/CheckItem',
  component: CheckItem,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { status: { control: 'inline-radio', options: ['pass', 'warning', 'fail'] } },
  args: { status: 'pass' },
} satisfies Meta<typeof CheckItem>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Pass: Story = { parameters: v('Status=Pass') }
export const Warning: Story = { args: { status: 'warning' }, parameters: v('Status=Warning') }
export const Fail: Story = { args: { status: 'fail' }, parameters: v('Status=Fail') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-mcp-space-section)' }}>
        <CheckItem status="pass" />
        <CheckItem status="warning" />
        <CheckItem status="fail" />
      </div>
    </BrandGrid>
  ),
}
