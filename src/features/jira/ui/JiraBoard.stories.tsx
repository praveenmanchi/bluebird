import type { Meta, StoryObj } from '@storybook/preact-vite'
import type { ComponentChildren } from 'preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { JiraBoard } from './JiraBoard'
import { JiraTab } from './Tab'
import { figma } from './JiraBoard.figma'
import { createMockHandlers } from '../mock'
import { reset, setFilter } from '../state'

const wide = { width: '1074px', height: '724px', display: 'flex', flexDirection: 'column' as const }
const pluginWindow = { width: '480px', height: '640px', display: 'flex', flexDirection: 'column' as const }

function withRpc(children: ComponentChildren) {
  const client = createRpcClient(createMockTransport(createMockHandlers(), 0))
  return <RpcProvider client={client}>{children}</RpcProvider>
}

const meta = { title: 'Screens/Jira board/Board', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Jira board" (40000269:5322) at the desktop-mock size: list beside detail. */
export const JiraBoardScreen: Story = {
  name: 'Jira board',
  parameters: { figma: { variant: 'Jira board' } },
  render: () => { reset(); return <div style={wide}>{withRpc(<JiraBoard />)}</div> },
}
/** The M plugin window (480×640): panels stack, the list scrolls at five rows. */
export const PluginWindow: Story = {
  render: () => { reset(); return <div style={pluginWindow}>{withRpc(<JiraBoard />)}</div> },
}
/** "Scope tabs & search": the scope Dropdown switched to Reported, with the search and filter toggles beside it. */
export const ReportedScope: Story = {
  render: () => { reset(); setFilter('scope', 'reported'); return <div style={pluginWindow}>{withRpc(<JiraBoard />)}</div> },
}
/** Search and filters open: a query and a narrowed status show both panels expanded on load. */
export const SearchAndFiltersOpen: Story = {
  render: () => { reset(); setFilter('query', 'jira'); setFilter('status', 'in-progress'); return <div style={pluginWindow}>{withRpc(<JiraBoard />)}</div> },
}
/** Figma "Jira UI · Not connected" (40000270:5749). */
export const NotConnected: Story = {
  render: () => { reset(); return <div style={pluginWindow}>{withRpc(<JiraTab initialConnection="not-connected" />)}</div> },
}
/** Jira Empty State › Error. */
export const ErrorState: Story = {
  render: () => { reset(); return <div style={pluginWindow}>{withRpc(<JiraTab initialConnection="error" />)}</div> },
}
