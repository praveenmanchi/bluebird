import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SourceCard } from './SourceCard'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SourceCard',
  component: SourceCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { name: 'Brand UI variables', meta: 'Variables · 421 tokens · 5 brand modes', selected: true },
} satisfies Meta<typeof SourceCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Source Card' } } }
export const Excluded: Story = { args: { selected: false } }
export const Indexing: Story = { args: { name: 'Type scale.md', meta: 'Document · 12 KB', icon: 'text', status: 'Indexing', statusTone: 'warning' } }

export const Interactive: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(true)
    return <SourceCard {...args} selected={selected} onToggle={setSelected} />
  },
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="400px">
      <SourceCard />
      <SourceCard name="Type scale.md" meta="Document · 12 KB" icon="text" selected={false} />
    </BrandGrid>
  ),
}
