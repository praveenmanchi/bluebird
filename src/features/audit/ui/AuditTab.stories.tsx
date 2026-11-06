import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { createMockHandlers, mockAudit, type MockScenario } from '../mock'
import { result, status } from '../state'
import { Tab } from './Tab'

/** The L plugin window — the size the Figma "Audit · 600" frames are drawn at. */
const L = { width: '600px', height: '643px', display: 'flex', flexDirection: 'column' as const }

function frame(scenario: MockScenario = 'default', setup?: () => void) {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  if (setup) queueMicrotask(() => setTimeout(setup, 0))
  return <div style={L}><RpcProvider client={client}><Tab /></RpcProvider></div>
}

const meta = { title: 'Screens/Audit', parameters: { layout: 'centered' } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "1 Ready". */
export const Ready: Story = { render: () => frame() }
/** Figma "4 Results". */
export const Results: Story = { render: () => frame('default', () => { result.value = mockAudit(); status.value = 'done' }) }
