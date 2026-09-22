// Fixture handlers for browser-only development (?mode=mock) and UI tests.
import type { HandlerMap } from '@shared/bridge'
import { MSG, type ScanResult } from './messages'

const sample: ScanResult = {
  scope: 'page',
  scanned: 1284,
  textNodes: 42,
  durationMs: 96,
  issues: [
    { nodeId: '1:1', name: 'Caption', text: 'Last synced 2 minutes ago', fontSize: 11, isBold: false, foreground: '#a1a1aa', background: '#ffffff', ratio: 2.55, level: 'fail' },
    { nodeId: '1:2', name: 'Hero title', text: 'Design faster, ship accurate', fontSize: 32, isBold: true, foreground: '#71717a', background: '#fafafa', ratio: 4.3, level: 'aa-large' },
    { nodeId: '1:3', name: 'Body', text: 'Your team has 3 pending reviews', fontSize: 14, isBold: false, foreground: '#52525b', background: '#ffffff', ratio: 6.7, level: 'aa' },
  ],
}

const many: ScanResult = {
  ...sample,
  scanned: 9_412,
  textNodes: 318,
  durationMs: 1_240,
  issues: Array.from({ length: 12 }, (_, i) => {
    const base = sample.issues[i % sample.issues.length]!
    return { ...base, nodeId: `2:${i + 1}`, name: `${base.name} ${i + 1}`, ratio: Math.round((base.ratio + i * 0.07) * 100) / 100 }
  }),
}

/** Dev-harness scenarios (?data=…): pick the fixture the fake Figma answers with. */
export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

export function createMockHandlers(scenario: MockScenario = 'default'): HandlerMap {
  return {
    [MSG.scan]: async (payload: { scope: 'selection' | 'page' }, ctx) => {
      const steps = scenario === 'slow' ? [200, 900, 2_400, 5_100, 9_412] : [400, 800, 1284]
      for (const visited of steps) {
        await new Promise((r) => setTimeout(r, scenario === 'slow' ? 600 : 120))
        ctx.emit(MSG.progress, { visited })
      }
      if (scenario === 'error') throw new Error('Figma stopped responding while traversing the page (mock scenario)')
      const result = scenario === 'many' || scenario === 'slow' ? many : scenario === 'empty' ? { ...sample, issues: [] } : sample
      return { ...result, scope: payload.scope, issues: payload.scope === 'selection' && scenario === 'default' ? result.issues.slice(0, 1) : result.issues }
    },
    [MSG.focus]: async () => undefined,
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
