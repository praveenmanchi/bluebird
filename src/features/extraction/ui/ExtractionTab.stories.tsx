import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport, type RpcClient } from '@shared/bridge'
import { refreshStatus, runExtract } from '../actions'
import { createMockHandlers, type MockScenario } from '../mock'
import { ExtractionTab } from './Tab'
import { figma } from './ExtractionResults.figma'

/** The L plugin window — the size the Figma "Extraction v2 · 600" frames are drawn at. */
const L = { width: '600px', height: '643px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

function frame(scenario: MockScenario = 'default', setup?: (rpc: RpcClient) => void) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ scenario, delayMs: 0 }), 0))
  if (setup) queueMicrotask(() => setTimeout(() => setup(client), 0))
  return <div style={L}><RpcProvider client={client}><ExtractionTab /></RpcProvider></div>
}

const meta = { title: 'Screens/Extraction', parameters: { layout: 'centered', figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Extraction v2 · 1 Ready". */
export const Ready: Story = { render: () => frame() }
/** Figma "Extraction v2 · 3 Results": the status loads, then the extraction runs against the default branch. */
export const Results: Story = {
  render: () => frame('default', (rpc) => { void refreshStatus(rpc).then(() => runExtract(rpc)) }),
  parameters: { figma: { variant: 'Extraction' } },
}
/** Figma "Extraction v2 · No branches yet". */
export const NoBranches: Story = { render: () => frame('many') }
