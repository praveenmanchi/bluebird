import { useEffect, useState } from 'preact/hooks'
import { Notice, Spinner } from '@shared/ui'
import { TESTABLE_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { IntegrationSection } from './integrations/IntegrationSection'
import { SECTIONS } from './integrations/sections'
import type { IntegrationsApi } from './integrations/client'
import './SettingsIntegrations.css'

export interface SettingsIntegrationsProps {
  /** Load / save calls (the sandbox store in the plugin, an in-memory fake in stories). */
  api: IntegrationsApi
}

type Load = { kind: 'loading' } | { kind: 'ready'; settings: IntegrationSettings } | { kind: 'failed'; message: string }

/**
 * Figma "Settings · Integrations" (40000408:8714): one bordered section per
 * integration (GitHub, Notifications, Storybook, Zeroheight, Dual File Mode,
 * AI Agent Assistance, MCP + Code Sync, Jira), each saving on its own.
 * SettingsScreen places the frame's persona card above and its Team Banner below.
 */
export function SettingsIntegrations({ api }: SettingsIntegrationsProps) {
  const [state, setState] = useState<Load>({ kind: 'loading' })

  useEffect(() => {
    let live = true
    api.load()
      .then((settings) => { if (live) setState({ kind: 'ready', settings }) })
      .catch((error: unknown) => { if (live) setState({ kind: 'failed', message: error instanceof Error ? error.message : 'Unknown error' }) })
    return () => { live = false }
  }, [api])

  return (
    <div class="bb-integrations" aria-busy={state.kind === 'loading' || undefined}>
      {state.kind === 'loading' && <div class="bb-integrations__loading"><Spinner tone="accent" label="Loading integration settings" /></div>}
      {state.kind === 'failed' && <Notice tone="error" title="Couldn’t load integration settings">{state.message}</Notice>}
      {state.kind === 'ready' && SECTIONS.map((spec) => (
        <IntegrationSection
            key={spec.id}
            spec={spec}
            initial={state.settings[spec.id]}
            onSave={api.save}
            onTest={api.test && TESTABLE_INTEGRATIONS.includes(spec.id) ? api.test : undefined}
          />
      ))}
    </div>
  )
}
