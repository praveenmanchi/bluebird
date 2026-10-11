import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TypeCompare } from './TypeCompare'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/TypeCompare',
  component: TypeCompare,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { current: { size: 13, lineHeight: 16 }, suggested: { size: 16, lineHeight: 24 } },
  decorators: [(Story) => <div style={{ width: '437px' }}><Story /></div>],
} satisfies Meta<typeof TypeCompare>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Type Compare' } } }
export const LetterSpacing: Story = { args: { current: { size: 11, lineHeight: 13, spec: '11px · 0px tracking' }, suggested: { size: 11, lineHeight: 17, spec: '11px · 0.12em tracking' } } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><TypeCompare {...args} /></BrandGrid> }
