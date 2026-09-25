import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ThumbnailPair } from './ThumbnailPair'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/ThumbnailPair',
  component: ThumbnailPair,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    before: { src: 'https://placehold.co/240x96/0C8CE9/8FB7E8/png?text=Before', alt: 'Label as drawn today' },
    after: { src: 'https://placehold.co/240x96/0C8CE9/FFFFFF/png?text=After', alt: 'Label with the suggested token' },
  },
} satisfies Meta<typeof ThumbnailPair>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Thumbnail Pair' } } }
export const SingleShot: Story = { args: { after: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><ThumbnailPair {...args} /></BrandGrid> }
