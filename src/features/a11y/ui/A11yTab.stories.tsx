import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { createMockHandlers, sampleScan, type MockScenario } from '../mock'
import { result } from '../state'
import { Tab } from './Tab'
import { figma } from './A11yResults.figma'

/** The L plugin window — the size the Figma "Accessibility L" frames are drawn at. */
const L = { width: '600px', height: '643px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

function frame(scenario: MockScenario = 'default', setup?: () => void) {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  if (setup) queueMicrotask(() => setTimeout(setup, 0))
  return <div style={L}><RpcProvider client={client}><Tab /></RpcProvider></div>
}

const meta = { title: 'Screens/Accessibility', parameters: { layout: 'centered', figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Accessibility L · Ready to scan". */
export const Ready: Story = { render: () => frame() }
/** Figma "Accessibility L · Results". */
export const Results: Story = { render: () => frame('default', () => { result.value = sampleScan }), parameters: { figma: { variant: 'Accessibility checker' } } }
