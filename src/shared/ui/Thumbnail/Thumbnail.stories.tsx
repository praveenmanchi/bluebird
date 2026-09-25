import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Thumbnail } from './Thumbnail'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/Thumbnail',
  component: Thumbnail,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { src: 'https://placehold.co/240x96/0C8CE9/8FB7E8/png?text=Before', alt: 'Label as drawn today', caption: 'Before' },
} satisfies Meta<typeof Thumbnail>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Thumbnail' } } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><Thumbnail {...args} /></BrandGrid> }
