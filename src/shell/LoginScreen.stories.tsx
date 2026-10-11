import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LoginScreen, type LoginScreenProps } from './LoginScreen'
import { figma } from './LoginScreen.figma'
import { SsoNotApprovedError } from './LoginSso'
import { BrandGrid } from '../../.storybook/helpers'

const frame = { width: '480px', height: '640px', display: 'flex', flexDirection: 'column' as const }
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const never = () => new Promise<void>(() => undefined)

/** Demo handlers: "BRIDGE-2026" is accepted, anything else fails; SSO hangs (Cancel to leave). */
const demo: Pick<LoginScreenProps, 'onSubmit' | 'onSso'> = {
  onSubmit: async (code, accepted) => {
    await wait(700)
    if (code.trim().toUpperCase() !== 'BRIDGE-2026') throw new Error('That access code is not recognised.')
    accepted()
    await never()
  },
  onSso: (_provider, signal) => new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))),
}
const screen = (props: Partial<LoginScreenProps> = {}) => () => <div style={frame}><LoginScreen {...demo} {...props} /></div>

const meta = { title: 'Screens/Login', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Login Page" — try BRIDGE-2026, or a wrong code for the error. */
export const LoginPage: Story = { parameters: { figma: { variant: 'Login Page' } }, render: screen() }
export const Typing: Story = { render: screen({ initial: { code: 'BRIDGE' } }) }
export const Submitting: Story = { render: screen({ initial: { code: 'BRIDGE-2026', phase: { kind: 'checking' } } }) }
export const ErrorState: Story = { render: screen({ initial: { code: 'WRONG-2026', phase: { kind: 'error', message: 'That access code is not recognised.' } } }) }
export const Success: Story = { render: screen({ initial: { code: 'BRIDGE-2026', phase: { kind: 'accepted' } } }) }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="400px">
      <div style={{ height: '640px', display: 'flex', flexDirection: 'column' }}>
        <LoginScreen {...demo} initial={{ code: 'WRONG-2026', phase: { kind: 'error', message: 'That access code is not recognised.' } }} />
      </div>
    </BrandGrid>
  ),
}

/** The SSO view inside the full page; the SSO frames themselves are under Screens/Login · SSO. */
export const SsoFromLogin: Story = { render: screen({ initial: { view: 'sso' }, onSso: async () => { await wait(1200); throw new SsoNotApprovedError() } }) }
