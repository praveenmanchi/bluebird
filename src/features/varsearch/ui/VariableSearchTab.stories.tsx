import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { createMockHandlers, MOCK_PAGES, MOCK_VARIABLES, type MockScenario } from '../mock'
import { expanded, pages, currentPageId, pageScope, query, result, status, types } from '../state'
import { Tab } from './Tab'

/** The L plugin window — the size the Figma "Variable search · 600" frames are drawn at. */
const L = { width: '600px', height: '643px', display: 'flex', flexDirection: 'column' as const }

function frame(scenario: MockScenario = 'default', setup?: () => void) {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  // Tab loads pages + recent on mount and resets on unmount; seed after mount.
  if (setup) queueMicrotask(() => setTimeout(setup, 0))
  return <div style={L}><RpcProvider client={client}><Tab /></RpcProvider></div>
}

const searched = (name: string) => () => {
  pages.value = MOCK_PAGES
  currentPageId.value = MOCK_PAGES[5]!.id
  pageScope.value = { mode: 'some', ids: ['Atoms', 'Molecules', 'Organisms'].map((n) => MOCK_PAGES.find((p) => p.name === n)!.id) }
  types.value = ['component']
  query.value = name
  const v = MOCK_VARIABLES.find((x) => x.name === name)!
  result.value = { query: name, matched: 1, variables: [v], scannedPages: 3, visited: 1920, durationMs: 840 }
  expanded.value = new Set([v.id])
  status.value = 'done'
}

const meta = { title: 'Screens/Variable search', parameters: { layout: 'centered' } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "1 Empty". */
export const Empty: Story = { render: () => frame('empty') }
/** Figma "2 Recent searches". */
export const RecentSearches: Story = { render: () => frame() }
/** Figma "3 Results": dropdown/border/default on Atoms / Molecules / Organisms, Component only. */
export const Results: Story = { render: () => frame('default', searched('dropdown/border/default')) }
/** Figma "Edge · No results". */
export const NoResults: Story = {
  render: () => frame('default', () => {
    query.value = 'dropdown/border/default'
    types.value = ['text-style']
    result.value = { query: 'dropdown/border/default', matched: 1, variables: [], scannedPages: 3, visited: 1920, durationMs: 610 }
    status.value = 'done'
  }),
}
/** Live in the mock: search, filter, expand, Show layers, Go to. */
export const Interactive: Story = { render: () => frame() }
