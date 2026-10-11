import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Notice } from './Notice'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Notice',
  component: Notice,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ width: '344px' }}><Story /></div>],
} satisfies Meta<typeof Notice>
export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = { args: { tone: 'info' }, parameters: { figma: { variant: 'Tone=Info' } } }
export const ErrorTone: Story = { args: { tone: 'error' }, parameters: { figma: { variant: 'Tone=Error' } } }
/** The Login Page instance: no surface, no icon, centred. */
export const Bare: Story = { args: { tone: 'info', bare: true } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="344px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Notice />
        <Notice tone="error" />
      </div>
    </BrandGrid>
  ),
}
