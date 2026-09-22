import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SettingsScreen } from './SettingsScreen'
import { figma } from './SettingsScreen.figma'
import { BrandGrid } from '../../.storybook/helpers'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const session = { brandId: 'bridge', since: '2026-09-22T09:00:00Z' }
const brand = { brandId: 'bridge', source: 'figma' as const, tokens: {} }

const meta = { title: 'Screens/Settings', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Settings page" content area; the chrome around it is the shell. */
export const SettingsPage: Story = {
  parameters: { figma: { variant: 'Settings page' } },
  render: () => <div style={{ width: '480px' }}><SettingsScreen session={session} brand={brand} onLogout={() => wait(600)} onReset={() => wait(600)} /></div>,
}
export const AcrossBrands: Story = {
  render: () => <BrandGrid width="360px"><SettingsScreen session={session} brand={brand} onLogout={() => wait(600)} onReset={() => wait(600)} /></BrandGrid>,
}
