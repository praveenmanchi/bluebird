import type { Meta, StoryObj } from '@storybook/preact-vite'
import { VariableCardExpanded, type VariableCardRow } from './VariableCardExpanded'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const ROWS: VariableCardRow[] = [
  { label: 'Button', value: 12 },
  { label: 'Checkbox', value: 4 },
  { label: 'Input', value: 9, status: 'added' },
  { label: 'Dropdown', value: 3 },
  { label: 'Tab', value: 24, status: 'removed' },
]

const meta = {
  title: 'Molecules/VariableCardExpanded',
  component: VariableCardExpanded,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    name: 'Color/Border/Black',
    meta: 'Universal Toolkit · Used by 52 components · Affects 1 mode/brands',
    changeCount: 52,
    summary: [
      { label: 'Frames', count: 18 },
      { label: 'Instances', count: 34 },
    ],
    rows: ROWS,
  },
} satisfies Meta<typeof VariableCardExpanded>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant. */
export const Default: Story = { parameters: { figma: { variant: 'Variable search card expand' } } }

export const TextStyle: Story = { args: { kind: 'text-style', name: 'Heading/H2', rows: ROWS.slice(0, 2) } }

export const NoSummary: Story = { args: { summary: [] } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="1080px">
      <VariableCardExpanded {...args} rows={ROWS.slice(0, 2)} />
    </BrandGrid>
  ),
}
