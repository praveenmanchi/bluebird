import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Banner } from './Banner'
import { TabBar } from './TabBar'
import { brandStatus } from './state'

const meta = { title: 'Shell/Chrome', parameters: { figma: { name: 'Navbar 7:44400 · team Banner 204:7270' } } } satisfies Meta
export default meta
type Story = StoryObj

/** Header (app-header/*) and tab bar (tab/*) as the plugin renders them. */
export const HeaderAndTabs: Story = {
  render: () => {
    brandStatus.value = { brandId: 'bridge', source: 'figma', tokens: {} }
    return (
      <div style={{ width: '400px' }}>
        <Banner />
        <TabBar />
      </div>
    )
  },
}
