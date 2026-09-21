import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { VariableCard } from './VariableCard'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/VariableCard',
  component: VariableCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { kind: { control: 'inline-radio', options: ['variable', 'text-style'] } },
  args: { kind: 'variable', name: 'Color/Border/Black', meta: 'Universal Toolkit · Used by 52 components · Affects 1 mode/brands', updated: '12 Days ago', changeCount: 52 },
} satisfies Meta<typeof VariableCard>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Variable: Story = { parameters: v('Property 1=variable') }
export const TextStyle: Story = { args: { kind: 'text-style', name: 'Heading/H2' }, parameters: v('Property 1=text style') }

export const Interactive: Story = {
  render: (args) => {
    const [expanded, setExpanded] = useState(false)
    return <VariableCard {...args} expanded={expanded} onToggle={setExpanded} />
  },
}

export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Collapsed', 'Expanded']} rows={['variable', 'text-style']}>
      {(row, col) => <VariableCard {...args} kind={row as 'variable' | 'text-style'} expanded={col === 'Expanded'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="1080px">
      <VariableCard {...args} />
      <VariableCard {...args} kind="text-style" name="Heading/H2" />
    </BrandGrid>
  ),
}
