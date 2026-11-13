import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ContextChip } from './ContextChip'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ContextChip',
  component: ContextChip,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { type: { control: 'inline-radio', options: ['selection', 'source', 'citation'] }, state: { control: 'inline-radio', options: ['default', 'focus'] } },
  args: { type: 'selection', children: 'Ticket Row · State=Selected' },
} satisfies Meta<typeof ContextChip>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Selection: Story = { parameters: v('Type=Selection, State=Default') }
export const Source: Story = { args: { type: 'source' }, parameters: v('Type=Source, State=Default') }
export const Citation: Story = { args: { type: 'citation' }, parameters: v('Type=Citation, State=Default') }
export const SelectionFocus: Story = { args: { state: 'focus' }, parameters: v('Type=Selection, State=Focus') }
export const SourceFocus: Story = { args: { type: 'source', state: 'focus' }, parameters: v('Type=Source, State=Focus') }
export const CitationFocus: Story = { args: { type: 'citation', state: 'focus' }, parameters: v('Type=Citation, State=Focus') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="220px">
      <ContextChip type="selection">Ticket Row · State=Selected</ContextChip>
      <ContextChip type="source">Brand UI variables</ContextChip>
      <ContextChip type="citation">Type scale.md</ContextChip>
    </BrandGrid>
  ),
}
