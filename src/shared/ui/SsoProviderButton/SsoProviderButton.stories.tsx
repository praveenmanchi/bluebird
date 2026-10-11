import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SsoProviderButton } from './SsoProviderButton'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SsoProviderButton',
  component: SsoProviderButton,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { onClick: { action: 'click' } },
  decorators: [(Story) => <div style={{ width: '344px' }}><Story /></div>],
} satisfies Meta<typeof SsoProviderButton>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })

export const Microsoft: Story = { args: { provider: 'microsoft' }, parameters: v('Provider=Microsoft, State=Default') }
export const MicrosoftHover: Story = { args: { provider: 'microsoft', state: 'hover' }, parameters: v('Provider=Microsoft, State=Hover') }
export const Okta: Story = { args: { provider: 'okta' }, parameters: v('Provider=Okta, State=Default') }
export const OktaHover: Story = { args: { provider: 'okta', state: 'hover' }, parameters: v('Provider=Okta, State=Hover') }
export const Google: Story = { args: { provider: 'google' }, parameters: v('Provider=Google, State=Default') }
export const GoogleHover: Story = { args: { provider: 'google', state: 'hover' }, parameters: v('Provider=Google, State=Hover') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="344px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SsoProviderButton provider="microsoft" />
        <SsoProviderButton provider="okta" state="hover" />
        <SsoProviderButton provider="google" />
      </div>
    </BrandGrid>
  ),
}
