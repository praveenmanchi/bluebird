import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PromptChip } from './PromptChip'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/PromptChip',
  component: PromptChip,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { children: 'What is our primary colour?', onClick: () => undefined },
} satisfies Meta<typeof PromptChip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Prompt Chip' } } }
export const Hover: Story = { args: { state: 'hover' } }
export const OtherGlyph: Story = { args: { icon: 'text', children: 'Which type scale do headings use?' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="240px">
      <PromptChip>What is our primary colour?</PromptChip>
      <PromptChip icon="component">Which components use it?</PromptChip>
    </BrandGrid>
  ),
}
