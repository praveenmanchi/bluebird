import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { Footer } from './Footer'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'
import type { SizeExpanderValue } from '../SizeExpander/SizeExpander'

const meta = {
  title: 'Organisms/Footer',
  component: Footer,
  parameters: { figma: { setId: figma.setId, name: figma.name }, layout: 'fullscreen' },
  args: { local: true, uxai: true, mcp: true, dualFile: true, size: 'M' },
} satisfies Meta<typeof Footer>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'footer' } } }
export const LocalOnly: Story = { args: { uxai: false, mcp: false, dualFile: false } }
export const CustomPills: Story = { args: { pills: [{ label: 'Local', status: 'good' }, { label: 'UX AI', status: 'issue' }, { label: 'MCP', status: 'error' }, { label: 'Dual File', status: 'retry' }] } }

export const Interactive: Story = {
  render: (args) => {
    const [size, setSize] = useState<SizeExpanderValue>(args.size ?? 'M')
    return <Footer {...args} size={size} onSizeChange={setSize} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="620px">
      <Footer {...args} />
      <Footer {...args} mcp={false} dualFile={false} />
    </BrandGrid>
  ),
}
