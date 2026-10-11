import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers } from '../mock'
import { RUN_STEP, SPEAK_MS, TICK_MS, RUN_ALL_STEP } from '../run'
import { reset } from '../state'

function renderTab() {
  const client = createRpcClient(createMockTransport(createMockHandlers(), 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

const card = (name: string) => screen.getByRole('heading', { name }).closest('article') as HTMLElement
const tick = (n: number) => act(() => { vi.advanceTimersByTime(TICK_MS * n) })
const RUN_TICKS = Math.ceil(100 / RUN_STEP)

describe('agents Tab', () => {
  beforeEach(() => { vi.useFakeTimers(); reset() })
  afterEach(() => { vi.useRealTimers() })

  it('opens on the gallery with the Figma copy and six agents', () => {
    renderTab()
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run all on scope' })).toBeInTheDocument()
    expect(screen.getByText('3 frames · 148 layers selected')).toBeInTheDocument()
    for (const name of ['Accessibility', 'Content', 'UX writing', 'Spelling & grammar', 'Design system', 'Localization']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    expect(within(card('Content')).getByText('Running 64%')).toBeInTheDocument()
    expect(within(card('Localization')).getByRole('button', { name: 'Notify me' })).toBeDisabled()
  })

  it('switches the scope and its meta', () => {
    renderTab()
    fireEvent.click(screen.getByRole('tab', { name: 'Whole page' }))
    expect(screen.getByRole('tab', { name: 'Whole page' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Checkout flow · 12 frames · 640 layers')).toBeInTheDocument()
  })

  it('opens Setup for a card, and coming-soon agents cannot be opened', () => {
    renderTab()
    fireEvent.click(card('Localization'))
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
    fireEvent.click(within(card('Accessibility')).getByRole('button', { name: 'Run' }))
    expect(screen.getByRole('heading', { name: 'Accessibility agent' })).toBeInTheDocument()
    expect(screen.getByText('RULE PACK · WCAG 2.2')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '1.4.6 Contrast (enhanced)' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '‹ All agents' }))
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
  })

  it('changes the mode copy and toggles rules in Setup', () => {
    renderTab()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('tab', { name: 'Review only' }))
    expect(screen.getByText(/Review only lists each issue/)).toBeInTheDocument()
    const rule = screen.getByRole('checkbox', { name: '1.4.6 Contrast (enhanced)' })
    fireEvent.click(rule)
    expect(rule).toBeChecked()
  })

  it('runs with a fake progression, streams findings and lands on Results', () => {
    renderTab()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    expect(screen.getByText('Running 0%')).toBeInTheDocument()
    tick(16) // 64%
    expect(screen.getByText('Running 64%')).toBeInTheDocument()
    expect(screen.getByText('FOUND SO FAR · 9')).toBeInTheDocument()
    expect(screen.getByText('Loaded rule pack · WCAG 2.2 AA (6 of 7 rules on)')).toBeInTheDocument()
    tick(RUN_TICKS)
    expect(screen.getByText('Done · 14 issues')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 14' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Stop returns to Setup', () => {
    renderTab()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    tick(5)
    fireEvent.click(screen.getByRole('button', { name: 'Stop agent' }))
    expect(screen.getByRole('button', { name: 'Run accessibility review' })).toBeInTheDocument()
    tick(RUN_TICKS)
    expect(screen.getByRole('button', { name: 'Run accessibility review' })).toBeInTheDocument()
  })

  it('filters results by severity and applies or ignores findings', () => {
    renderTab()
    fireEvent.click(screen.getAllByRole('button', { name: 'Open report' })[0]!)
    fireEvent.click(screen.getByRole('tab', { name: 'Critical 2' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    const first = screen.getAllByRole('listitem')[0]!
    fireEvent.click(within(first).getByRole('button', { name: 'Apply fix' }))
    expect(screen.getByRole('tab', { name: 'Critical 1' })).toBeInTheDocument()
    expect(screen.getByText('Done · 13 issues')).toBeInTheDocument()
    fireEvent.click(within(screen.getAllByRole('listitem')[0]!).getByRole('button', { name: 'Ignore' }))
    expect(screen.getByText('Nothing left in this filter.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'All 12' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply 4 safe fixes' }))
    expect(screen.getByRole('tab', { name: 'Fixable 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create 8 Jira issues' })).toBeEnabled()
  })

  it('locates a finding through the bridge without failing', () => {
    renderTab()
    fireEvent.click(screen.getAllByRole('button', { name: 'Open report' })[0]!)
    fireEvent.click(within(screen.getAllByRole('listitem')[0]!).getByRole('button', { name: 'Locate' }))
    expect(screen.getByText('Done · 14 issues')).toBeInTheDocument()
  })

  it('mic opens the Voice view: listening → speaking → idle, and back', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Talk to the agents' }))
    expect(screen.getByText('Listening')).toBeInTheDocument()
    expect(screen.getByText('“Yes — fix the four and leave the other two for me.”')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText('Speaking')).toBeInTheDocument()
    expect(screen.getByText('“Applying the 4 safe fixes now. The other 2 are yours.”')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(SPEAK_MS) })
    expect(screen.getByText('Applying the 4 safe fixes now. The other 2 are yours.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show me first' }))
    expect(screen.getAllByText('Show me first')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '‹ All agents' }))
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
  })

  it('Run all walks every ready agent one after another and unlocks Apply', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Run all on scope' }))
    expect(screen.getByRole('heading', { name: 'Running all agents' })).toBeInTheDocument()
    expect(screen.getByText('0 of 5 agents done · 0 findings so far')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply 0 safe fixes' })).toBeDisabled()
    const perAgent = Math.ceil(100 / RUN_ALL_STEP)
    tick(perAgent * 3)
    expect(screen.getByText('3 of 5 agents done · 26 findings so far')).toBeInTheDocument()
    expect(screen.getByText('Merged report: 26 findings · 12 auto-fixable · grouped by layer')).toBeInTheDocument()
    expect(screen.getByText('Waits for Content to finish')).toBeInTheDocument()
    tick(perAgent * 2)
    expect(screen.getByText('5 of 5 agents done · 40 findings so far')).toBeInTheDocument()
    const apply = screen.getByRole('button', { name: 'Apply 26 safe fixes' })
    expect(apply).toBeEnabled()
    fireEvent.click(apply)
    expect(screen.getByRole('button', { name: '26 safe fixes applied' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Open Accessibility results' }))
    expect(screen.getByText('Done · 8 issues')).toBeInTheDocument()
  })

  it('Stop all returns to the gallery', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Run all on scope' }))
    tick(3)
    fireEvent.click(screen.getByRole('button', { name: 'Stop all' }))
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
  })

  it('Stop on the running Content card sets it back to Ready', () => {
    renderTab()
    fireEvent.click(within(card('Content')).getByRole('button', { name: 'Stop' }))
    expect(within(card('Content')).getByText('Ready')).toBeInTheDocument()
  })
})
