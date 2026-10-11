import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { personas } from '@shared/config'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
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
/** Code-only Persona row (moved from the banner); the switch is live in this story. */
export const WithPersonaSwitch: Story = {
  render: () => {
    const [personaId, setPersonaId] = useState(personas[0]?.id ?? null)
    return <div style={{ width: '480px' }}><SettingsScreen session={session} brand={brand} onLogout={() => wait(600)} onReset={() => wait(600)} personas={personas} personaId={personaId} onPersonaChange={setPersonaId} /></div>
  },
}
/** The full Settings page in the plugin: persona card, session, persona switch, integrations, Team Banner. */
export const WithIntegrations: Story = {
  render: () => {
    const [personaId, setPersonaId] = useState(personas[0]?.id ?? null)
    const [integrations] = useState(() => ({ load: async () => DEFAULT_INTEGRATIONS, save: async (_s: string, v: unknown) => { await wait(500); return v as never } }))
    return <div style={{ width: '760px' }}><SettingsScreen session={session} brand={brand} onLogout={() => wait(600)} onReset={() => wait(600)} personas={personas} personaId={personaId} onPersonaChange={setPersonaId} integrations={integrations} /></div>
  },
}
export const AcrossBrands: Story = {
  render: () => <BrandGrid width="360px"><SettingsScreen session={session} brand={brand} onLogout={() => wait(600)} onReset={() => wait(600)} /></BrandGrid>,
}
