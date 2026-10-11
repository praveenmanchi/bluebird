import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TargetPreview } from './TargetPreview'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/TargetPreview',
  component: TargetPreview,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { width: 18, height: 18, spacing: 4 },
  decorators: [(Story) => <div style={{ width: '437px' }}><Story /></div>],
} satisfies Meta<typeof TargetPreview>
export default meta
type Story = StoryObj<typeof meta>

export const Fail: Story = { parameters: { figma: { variant: 'State=Fail' } } }
export const Pass: Story = { args: { width: 24, height: 24, spacing: 24 }, parameters: { figma: { variant: 'State=Pass' } } }
export const SpacingException: Story = { args: { width: 18, height: 18, spacing: 8 } }
export const Unmeasured: Story = { args: { width: 16, height: 16, spacing: undefined } }
export const Enhanced: Story = { args: { width: 32, height: 32, minimum: 44, spacing: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><TargetPreview {...args} /></BrandGrid> }
