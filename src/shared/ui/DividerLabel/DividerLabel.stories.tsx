import type { Meta, StoryObj } from '@storybook/preact-vite'
import { DividerLabel } from './DividerLabel'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/DividerLabel',
  component: DividerLabel,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ width: '344px' }}><Story /></div>],
} satisfies Meta<typeof DividerLabel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Divider Label' } } }
export const CantUseSso: Story = { args: { children: 'Can’t use SSO?' } }

export const AcrossBrands: Story = { render: () => <BrandGrid width="344px"><DividerLabel /></BrandGrid> }
