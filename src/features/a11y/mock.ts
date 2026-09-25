// Fixture handlers for browser-only development (?mode=mock) and UI tests.
import type { HandlerMap } from '@shared/bridge'
import { MSG, type ScanResult } from './messages'

const sample: ScanResult = {
  scope: 'page',
  meta: { file: 'Plugin UI', page: 'Marketing site', brand: 'Bridge' },
  scanned: 1284,
  textNodes: 42,
  durationMs: 96,
  exempt: 4,
  instancesSkipped: 37,
  nonText: [
    { nodeId: '3:1', nodeIds: ['3:1', '3:2'], occurrences: 2, name: 'Input border', foreground: '#e4e4e7', background: '#ffffff', ratio: 1.24 },
  ],
  targets: [
    { nodeId: '4:1', nodeIds: ['4:1'], occurrences: 1, name: 'Close', width: 16, height: 16, required: 24, evidence: 'reaction' },
    { nodeId: '4:2', nodeIds: ['4:2', '4:3'], occurrences: 2, name: 'Chip / remove', width: 32, height: 20, required: 24, evidence: 'control' },
  ],
  unmeasurable: [
    { nodeId: '1:9', name: 'Hero overline', text: 'Spring collection', reason: 'sits on an image fill' },
  ],
  issues: [
    {
      nodeId: '1:1', nodeIds: ['1:1', '1:4', '1:5'], occurrences: 3, name: 'Caption',
      text: 'Last synced 2 minutes ago', fontSize: 11, isBold: false,
      foreground: '#a1a1aa', background: '#ffffff', ratio: 2.55, level: 'fail',
      fgToken: { id: 'v:1', name: 'Brand/Text/Muted', mode: 'Bridge' },
      bgToken: { id: 'v:2', name: 'Brand/Surface/Canvas', mode: 'Bridge' },
      brandModes: [
        { brand: 'Bridge', pass: false, ratio: 2.55 },
        { brand: 'Ikea', pass: true, ratio: 7.1 },
        { brand: 'Richemont', pass: true, ratio: 5.8 },
        { brand: 'Disney', pass: false, ratio: 3.1 },
        { brand: 'Fiskars', pass: true, ratio: 8.4 },
      ],
      fix: { tokenId: 'v:3', tokenName: 'Brand/Text/Secondary', hex: '#52525b', ratio: 7.36, mode: 'Bridge' },
    },
    { nodeId: '1:2', nodeIds: ['1:2'], occurrences: 1, name: 'Hero title', text: 'Design faster, ship accurate', fontSize: 32, isBold: true, foreground: '#71717a', background: '#fafafa', ratio: 4.3, level: 'aa-large' },
    { nodeId: '1:3', nodeIds: ['1:3', '1:6'], occurrences: 2, name: 'Body', text: 'Your team has 3 pending reviews', fontSize: 14, isBold: false, foreground: '#52525b', background: '#ffffff', ratio: 6.7, level: 'aa' },
  ],
}

const many: ScanResult = {
  ...sample,
  scanned: 9_412,
  textNodes: 318,
  durationMs: 1_240,
  issues: Array.from({ length: 12 }, (_, i) => {
    const base = sample.issues[i % sample.issues.length]!
    return { ...base, nodeId: `2:${i + 1}`, nodeIds: [`2:${i + 1}`], occurrences: 1, name: `${base.name} ${i + 1}`, ratio: Math.round((base.ratio + i * 0.07) * 100) / 100 }
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
    [MSG.selectAll]: async (payload: { nodeIds: readonly string[] }) => ({ selected: payload.nodeIds.length }),
    [MSG.applyFix]: async (payload: { nodeIds: readonly string[] }) => ({ applied: payload.nodeIds.length }),
    [MSG.annotate]: async (payload: { nodeIds: readonly string[] }) => ({ annotated: payload.nodeIds.length }),
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
