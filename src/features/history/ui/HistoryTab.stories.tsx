import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { createMockHandlers, type MockScenario } from '../mock'
import { HistoryTab } from './Tab'
import { figma } from './HistoryTimeline.figma'

/** The L plugin window — the size the Figma "History · 600" frames are drawn at. */
const L = { width: '600px', height: '643px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

function frame(scenario: MockScenario = 'default') {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  return <div style={L}><RpcProvider client={client}><HistoryTab /></RpcProvider></div>
}

const meta = { title: 'Screens/History', parameters: { layout: 'centered', figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "History · 1 Timeline": the list loads on mount. */
export const Timeline: Story = { render: () => frame(), parameters: { figma: { variant: 'History' } } }
/** Figma "History · Empty". */
export const Empty: Story = { render: () => frame('empty') }
