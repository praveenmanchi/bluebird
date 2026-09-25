import type { Meta, StoryObj } from '@storybook/preact-vite'
import { IgnoreBanner } from './IgnoreBanner'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/IgnoreBanner',
  component: IgnoreBanner,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    reason: 'Decorative watermark, exempt under 1.4.3',
    scope: 'Applies to this colour pair',
    author: 'by Praveen',
    expires: 'expires 2026-12-01',
    onUndo: () => undefined,
  },
} satisfies Meta<typeof IgnoreBanner>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Ignore Banner' } } }
export const NoProvenance: Story = { args: { reason: undefined, scope: undefined, author: undefined, expires: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><IgnoreBanner {...args} /></BrandGrid> }
