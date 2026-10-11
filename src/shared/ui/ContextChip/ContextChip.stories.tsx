import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ContextChip } from './ContextChip'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ContextChip',
  component: ContextChip,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { type: { control: 'inline-radio', options: ['selection', 'source', 'citation'] } },
  args: { type: 'selection', children: 'Ticket Row · State=Selected' },
} satisfies Meta<typeof ContextChip>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Selection: Story = { parameters: v('Type=Selection') }
export const Source: Story = { args: { type: 'source' }, parameters: v('Type=Source') }
export const Citation: Story = { args: { type: 'citation' }, parameters: v('Type=Citation') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="220px">
      <ContextChip type="selection">Ticket Row · State=Selected</ContextChip>
      <ContextChip type="source">Brand UI variables</ContextChip>
      <ContextChip type="citation">Type scale.md</ContextChip>
    </BrandGrid>
  ),
}
