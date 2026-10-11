import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LoginScreen } from './LoginScreen'
import { SsoNotApprovedError, type LoginSsoPhase, type SsoHandler } from './LoginSso'
import { figma } from './LoginSso.figma'
import { BrandGrid } from '../../.storybook/helpers'

const frame = { width: '480px', height: '640px', display: 'flex', flexDirection: 'column' as const }
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const notApproved: SsoHandler = async (_p, signal) => {
  await wait(1500)
  if (!signal.aborted) throw new SsoNotApprovedError()
}
const onSubmit = async () => { await wait(600); throw new Error('That access code is not recognised.') }
const sso = (phase: LoginSsoPhase) => () => (
  <div style={frame}><LoginScreen onSubmit={onSubmit} onSso={notApproved} initial={{ view: 'sso', sso: phase }} /></div>
)

const meta = { title: 'Screens/Login · SSO', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Login · SSO" — pick a provider to see Redirecting, then Not approved. */
export const Sso: Story = { parameters: { figma: { variant: 'Login · SSO' } }, render: sso({ kind: 'choose' }) }
/** Figma "Login · SSO redirecting". */
export const Redirecting: Story = { render: sso({ kind: 'waiting', provider: 'microsoft' }) }
/** Figma "Login · SSO not approved". */
export const NotApproved: Story = { render: sso({ kind: 'not-approved' }) }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="400px">
      <div style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
        <LoginScreen onSubmit={onSubmit} onSso={notApproved} initial={{ view: 'sso', sso: { kind: 'not-approved' } }} />
      </div>
    </BrandGrid>
  ),
}
