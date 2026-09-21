import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { PageFilter } from './PageFilter'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/PageFilter',
  component: PageFilter,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { label: 'All Pages', icon: 'file' },
} satisfies Meta<typeof PageFilter>
export default meta
type Story = StoryObj<typeof meta>

export const Pages: Story = { parameters: { figma: { variant: 'pages' } } }
export const Hover: Story = { args: { state: 'hover' } }
export const Open: Story = { args: { open: true } }

export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false)
    return <PageFilter {...args} open={open} onClick={() => setOpen((o) => !o)} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <PageFilter {...args} />
      <PageFilter {...args} label="Current page" open />
    </BrandGrid>
  ),
}
