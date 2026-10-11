import { useMemo } from 'preact/hooks'
import { McpHandoff } from './McpHandoff'
import type { HandoffScenarioId } from '../fixtures'
import { goTo, reset, selectScenario, type FlowStep } from '../state'

/** Figma "MCP flow v2 · 600" bodies are 600×616; the shell's <main> gives the body its height. */
const frame = { width: '600px', height: '616px', overflow: 'auto', display: 'flex', flexDirection: 'column' as const }

export interface ScreenFixtureProps {
  id?: HandoffScenarioId
  at?: FlowStep
  /** Puts the tab signals into the Figma frame's state after the scenario loads. */
  setup?: () => void
}

/** Storybook-only: the MCP tab body in one Figma frame's state. Setup runs once per mount; clicks then drive the flow. */
export function ScreenFixture({ id = 'ready', at = 0, setup }: ScreenFixtureProps) {
  useMemo(() => { reset(); selectScenario(id); goTo(at); setup?.() }, [])
  return <div style={frame}><McpHandoff /></div>
}
