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

export const mockHandlers: HandlerMap = {
  [MSG.scan]: async (payload: { scope: 'selection' | 'page' }, ctx) => {
    for (const visited of [400, 800, 1284]) {
      await new Promise((r) => setTimeout(r, 120))
      ctx.emit(MSG.progress, { visited })
    }
    return { ...sample, scope: payload.scope, issues: payload.scope === 'selection' ? sample.issues.slice(0, 1) : sample.issues }
  },
  [MSG.focus]: async () => undefined,
}
