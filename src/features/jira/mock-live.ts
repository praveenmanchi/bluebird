// Dev harness only: the fixture handlers, except that once the mock Settings
// hold a complete, switched-on Jira connection every Jira call goes to the
// real handlers with the browser's fetch — so `npm run jira:proxy` plus
// Settings › Proxy URL = http://localhost:8787 shows real tickets on localhost.
// Imported behind import.meta.env.DEV, so production bundles drop it.
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import type { IntegrationValues } from '@shared/integrations'
import { configFromSettings, isConfig, type HttpFetch } from './api/http'
import { MSG, type SelectionLink } from './messages'
import { createMockHandlers } from './mock'
import { createJiraHandlers } from './sandbox/jira-handlers'

export interface LiveMockOptions {
  readSettings: () => Promise<IntegrationValues<'jira'>>
  fetch: HttpFetch
}

export function createLiveMockHandlers({ readSettings, fetch }: LiveMockOptions): HandlerMap {
  const fixtures = createMockHandlers()
  const live = createJiraHandlers({
    readSettings,
    fetch,
    openExternal: (url) => { window.open(url, '_blank', 'noopener') },
    selection: fixtures[MSG.selection] as () => Promise<SelectionLink | null>,
    focus: async () => undefined,
  })
  // Test Connection always calls Jira: it brings its own (unsaved) values.
  const useLive = async (type: string) => type === MSG.test || isConfig(configFromSettings(await readSettings()))
  return Object.fromEntries(Object.entries(fixtures).map(([type, fixture]) => [
    type,
    async (payload: never, ctx: HandlerContext) => (await useLive(type) ? live[type]! : fixture)(payload, ctx),
  ]))
}
