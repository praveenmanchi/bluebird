import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LoginFooter } from './LoginFooter'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/LoginFooter',
  component: LoginFooter,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { onSwitch: { action: 'switch' } },
  decorators: [(Story) => <div style={{ width: '344px' }}><Story /></div>],
} satisfies Meta<typeof LoginFooter>
export default meta
type Story = StoryObj<typeof meta>

export const AccessCode: Story = { args: { view: 'access-code' }, parameters: { figma: { variant: 'View=Access code' } } }
export const Sso: Story = { args: { view: 'sso' }, parameters: { figma: { variant: 'View=SSO' } } }

export const AcrossBrands: Story = { render: () => <BrandGrid width="344px"><LoginFooter /></BrandGrid> }
