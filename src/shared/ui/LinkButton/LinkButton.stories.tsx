import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LinkButton } from './LinkButton'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/LinkButton',
  component: LinkButton,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { children: 'Select all' },
} satisfies Meta<typeof LinkButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Link Button' } } }
export const Restore: Story = { args: { children: 'Restore' } }
export const Disabled: Story = { args: { disabled: true } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><LinkButton {...args} /></BrandGrid> }
