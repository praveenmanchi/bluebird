import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { UxaiSelection } from './UxaiSelection'
import { figma } from './UxaiSelection.figma'
import { SCREEN_THREADS, SOURCES, VARIABLES, type PanelMode } from '../fixtures'
import { Frame } from './stories.helpers'

const meta = { title: 'Screens/UXAI/Selection', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Swaps, Discard, Apply and the mode tabs work on local state. */
function Live() {
  const [variables, setVariables] = useState(VARIABLES)
  const [mode, setMode] = useState<PanelMode>('swap')
  return (
    <UxaiSelection
      turns={SCREEN_THREADS.selection}
      sources={SOURCES}
      draft=""
      variables={variables}
      panelMode={mode}
      onPanelMode={setMode}
      onSwap={(index, value) => setVariables(variables.map((v, i) => (i === index ? { ...v, value } : v)))}
      onDiscard={() => setVariables(variables.map((v) => ({ ...v, value: v.token })))}
      onApply={() => setVariables(variables.map((v) => ({ ...v, token: v.value })))}
    />
  )
}

/** Figma "UX AI · Selection" — body "UX AI body". */
export const Selection: Story = {
  parameters: { figma: { variant: 'UX AI body' } },
  render: () => <Frame><Live /></Frame>,
}

export const Small: Story = {
  render: () => <Frame width="360px" height="480px"><Live /></Frame>,
}
