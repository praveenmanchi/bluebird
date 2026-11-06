import type { Meta, StoryObj } from '@storybook/preact-vite'
import { personas } from '@shared/config'
import { PersonaScreen } from './PersonaScreen'

const meta: Meta<typeof PersonaScreen> = {
  title: 'Shell/PersonaScreen',
  component: PersonaScreen,
  args: { personas, onConfirm: () => undefined },
  decorators: [(Story) => <div style={{ width: 480, height: 640, display: 'flex' }}><Story /></div>],
}
export default meta
type Story = StoryObj<typeof PersonaScreen>

export const FirstRun: Story = {}
export const Picked: Story = { args: { intro: false, initialId: 'ui-designer' } }
export const FromSettings: Story = { args: { intro: false, initialId: 'developer', onCancel: () => undefined } }
