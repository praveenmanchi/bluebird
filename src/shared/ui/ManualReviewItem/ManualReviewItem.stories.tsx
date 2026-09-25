import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ManualReviewItem } from './ManualReviewItem'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ManualReviewItem',
  component: ManualReviewItem,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { kind: 'design', label: 'Focus ring reaches 3:1 against both neighbours', done: false },
} satisfies Meta<typeof ManualReviewItem>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Todo: Story = { parameters: v('Done=No') }
export const Done: Story = { args: { done: true }, parameters: v('Done=Yes') }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><ul style={{ margin: 0, padding: 0 }}><ManualReviewItem {...args} /></ul></BrandGrid> }
