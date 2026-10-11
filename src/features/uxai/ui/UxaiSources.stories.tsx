import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { RpcProvider } from '@shared/ui'
import { createMockTransport, createRpcClient } from '@shared/bridge'
import { UxaiSources } from './UxaiSources'
import { figma } from './UxaiSources.figma'
import { Tab } from './Tab'
import { createMockHandlers } from '../mock'
import { SOURCES } from '../fixtures'
import { Frame } from './stories.helpers'

const meta = { title: 'Screens/UXAI/Sources', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

function Live() {
  const [sources, setSources] = useState(SOURCES)
  // Figma draws both header actions; they have no handler in the tab yet, so only the story passes them.
  return <UxaiSources sources={sources} draft="" onToggleSource={(id, selected) => setSources(sources.map((s) => (s.id === id ? { ...s, selected } : s)))} onUploadFile={() => undefined} onAddLibrary={() => undefined} />
}

/** Figma "UX AI · Sources" — body "UX AI body". */
export const Sources: Story = {
  parameters: { figma: { variant: 'UX AI body' } },
  render: () => <Frame><Live /></Frame>,
}

export const Small: Story = {
  render: () => <Frame width="360px" height="480px"><Live /></Frame>,
}

/** The whole tab on fixtures: ask, watch it think, Stop, swap variables, manage sources. */
export const WholeTab: Story = {
  render: () => (
    <Frame>
      <RpcProvider client={createRpcClient(createMockTransport(createMockHandlers(), 0))}><Tab /></RpcProvider>
    </Frame>
  ),
}
