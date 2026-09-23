import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ManualReview } from './ManualReview'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/ManualReview',
  component: ManualReview,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    checks: [
      { kind: 'content', label: 'The label still reads correctly at 200% zoom', done: true },
      { kind: 'design', label: 'Focus ring reaches 3:1 against both neighbours' },
      { kind: 'code', label: 'Colour is not the only signal for the error state' },
    ],
    onToggle: () => undefined,
  },
} satisfies Meta<typeof ManualReview>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Manual Review' } } }
export const ReadOnly: Story = { args: { onToggle: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><ManualReview {...args} /></BrandGrid> }
