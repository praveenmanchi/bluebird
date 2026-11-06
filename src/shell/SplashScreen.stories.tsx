import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SplashScreen } from './SplashScreen'

const meta: Meta<typeof SplashScreen> = {
  title: 'Shell/SplashScreen',
  component: SplashScreen,
  args: { onDone: () => undefined },
  decorators: [(Story) => <div style={{ width: 480, height: 640, display: 'flex' }}><Story /></div>],
}
export default meta
type Story = StoryObj<typeof SplashScreen>

export const Playing: Story = {}
export const Still: Story = { args: { still: true } }
