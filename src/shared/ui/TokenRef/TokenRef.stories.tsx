import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TokenRef } from './TokenRef'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/TokenRef',
  component: TokenRef,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { name: 'Brand/Text/Secondary', mode: 'Bridge' },
} satisfies Meta<typeof TokenRef>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Token Ref' } } }
export const WithoutMode: Story = { args: { mode: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><TokenRef {...args} /></BrandGrid> }
