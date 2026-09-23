// Fixture handlers for browser-only development (?mode=mock) and UI tests.
import type { HandlerMap } from '@shared/bridge'
import { MSG, type AuditResult } from './messages'

const sample: AuditResult = {
  scope: 'page',
  meta: { file: 'Plugin UI', page: 'Marketing site', brand: 'Bridge' },
  scanned: 1284,
  boundPaints: 412,
  coverage: 0.87,
  durationMs: 118,
  unbound: [
    { nodeId: '5:1', nodeIds: ['5:1', '5:2', '5:3'], occurrences: 3, name: 'Card', kind: 'fill', hex: '#fafafa', suggestion: { id: 'v:1', name: 'Brand/Surface/Canvas' } },
    { nodeId: '5:4', nodeIds: ['5:4'], occurrences: 1, name: 'Divider', kind: 'stroke', hex: '#e7e5e4' },
  ],
  offScale: [
    { nodeId: '6:1', nodeIds: ['6:1', '6:2'], occurrences: 2, name: 'Toolbar', property: 'gap', value: 10, nearest: 9 },
    { nodeId: '6:3', nodeIds: ['6:3'], occurrences: 1, name: 'Hero', property: 'padding-top', value: 37, nearest: 41 },
  ],
}

export type MockScenario = 'default' | 'clean' | 'error'

export function createMockHandlers(scenario: MockScenario = 'default'): HandlerMap {
  return {
    [MSG.audit]: async (payload: { scope: 'selection' | 'page' }, ctx) => {
      for (const visited of [400, 900, 1284]) {
        await new Promise((r) => setTimeout(r, 90))
        ctx.emit(MSG.progress, { visited })
      }
      if (scenario === 'error') throw new Error('Figma stopped responding while traversing the page (mock scenario)')
      if (scenario === 'clean') return { ...sample, scope: payload.scope, unbound: [], offScale: [], coverage: 1 }
      return { ...sample, scope: payload.scope }
    },
    [MSG.focus]: async () => undefined,
    [MSG.selectAll]: async (payload: { nodeIds: readonly string[] }) => ({ selected: payload.nodeIds.length }),
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
