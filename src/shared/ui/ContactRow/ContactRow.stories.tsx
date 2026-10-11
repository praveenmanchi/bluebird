import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ContactRow } from './ContactRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/ContactRow',
  component: ContactRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ width: '344px' }}><Story /></div>],
} satisfies Meta<typeof ContactRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Contact Row' } } }

export const AcrossBrands: Story = { render: () => <BrandGrid width="344px"><ContactRow /></BrandGrid> }
