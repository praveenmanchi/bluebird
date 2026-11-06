import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { createMockHandlers, type MockScenario } from '../mock'
import { Tab } from './Tab'

/** The L plugin window — the size the Figma "Variable mapper · 600" frames are drawn at. */
const L = { width: '600px', height: '643px', display: 'flex', flexDirection: 'column' as const }

function frame(scenario: MockScenario = 'default') {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  return <div style={L}><RpcProvider client={client}><Tab /></RpcProvider></div>
}

const meta = { title: 'Screens/Variable mapper', parameters: { layout: 'centered' } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "2 Results": a real check of the Login page's Page header. */
export const Results: Story = { render: () => frame() }
/** Figma "1 Nothing selected". */
export const NothingSelected: Story = { render: () => frame('empty') }
/** Figma "Source failed". */
export const SourceFailed: Story = { render: () => frame('error') }
