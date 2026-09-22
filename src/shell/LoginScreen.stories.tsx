import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LoginScreen } from './LoginScreen'
import { figma } from './LoginScreen.figma'
import { BrandGrid } from '../../.storybook/helpers'

const frame = { width: '480px', height: '640px', display: 'flex', flexDirection: 'column' as const }
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const meta = { title: 'Screens/Login', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Login Page". Every code is rejected here so the error state can be seen. */
export const LoginPage: Story = {
  parameters: { figma: { variant: 'Login Page' } },
  render: () => <div style={frame}><LoginScreen onSubmit={async () => { await wait(600); throw new Error('That access code is not recognised.') }} /></div>,
}
export const AcrossBrands: Story = {
  render: () => <BrandGrid width="360px"><div style={{ height: '420px', display: 'flex' }}><LoginScreen onSubmit={async () => undefined} /></div></BrandGrid>,
}
