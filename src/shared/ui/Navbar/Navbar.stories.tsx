import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { Navbar, NAVBAR_DEFAULT_ITEMS } from './Navbar'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/Navbar',
  component: Navbar,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { items: NAVBAR_DEFAULT_ITEMS, active: 'variables', trailing: { id: 'more', label: 'More', icon: 'navbar-tab-icon' } },
} satisfies Meta<typeof Navbar>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Navbar' } } }
export const NoIcons: Story = { args: { showIcons: false } }
export const WithoutTrailing: Story = { args: { trailing: undefined } }

export const Interactive: Story = {
  render: (args) => {
    const [active, setActive] = useState(args.active)
    return <Navbar {...args} active={active} onChange={setActive} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="880px">
      <Navbar {...args} />
    </BrandGrid>
  ),
}
