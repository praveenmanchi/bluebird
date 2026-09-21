import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Tab } from './Tab'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Tab',
  component: Tab,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'active', 'variant3'] },
    icon: { control: 'select', options: ['variables', 'uxai', 'accessibility', 'inspect', 'component', 'navbar-tab-icon'] },
  },
  args: { children: 'UXAI as assister', icon: 'variables', showIcon: true },
} satisfies Meta<typeof Tab>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Default: Story = { parameters: v('Property 1=Default') }
export const Active: Story = { args: { variant: 'active' }, parameters: v('Property 1=Active') }
export const Variant3: Story = { args: { variant: 'variant3', icon: 'uxai' }, parameters: v('Property 1=Variant3') }

export const Hover: Story = { args: { state: 'hover' } }
export const NoIcon: Story = { args: { showIcon: false } }
export const Variant3WithText: Story = { args: { variant: 'variant3', icon: 'uxai', showVariant3Text: true } }
export const NavbarIcon: Story = { args: { variant: 'variant3', icon: 'navbar-tab-icon' } }

/** Property 1 × Show Header Icons. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Icon', 'No icon']} rows={['Default', 'Active', 'Variant3']}>
      {(row, col) => <Tab {...args} variant={row.toLowerCase() as 'default' | 'active' | 'variant3'} showIcon={col === 'Icon'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <Tab {...args} />
      <Tab {...args} variant="active" />
      <Tab {...args} variant="variant3" icon="uxai" />
    </BrandGrid>
  ),
}
