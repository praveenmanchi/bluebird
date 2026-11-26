import { useEffect, useState } from 'preact/hooks'
import { Notice, Spinner } from '@shared/ui'
import { TESTABLE_INTEGRATIONS, type IntegrationSettings, type ManagedIntegrations } from '@shared/integrations'
import { IntegrationSection } from './integrations/IntegrationSection'
import { SECTIONS } from './integrations/sections'
import { TeamSetup } from './integrations/TeamSetup'
import type { IntegrationsApi } from './integrations/client'
import './SettingsIntegrations.css'

export interface SettingsIntegrationsProps {
  /** Load / save calls (the sandbox store in the plugin, an in-memory fake in stories). */
  api: IntegrationsApi
  /** Sections the signed-in brand sets (plugin.config.json); their fields show locked. */
  managed?: ManagedIntegrations
  /** Brand label for the locked sections' note. */
  managedBy?: string
  /** Signed-in brand, for the team setup file's name. */
  brandId?: string | null
}

/** `rev` counts imports: the sections remount on it, so their forms show what the file set. */
type Load = { kind: 'loading' } | { kind: 'ready'; settings: IntegrationSettings; rev: number } | { kind: 'failed'; message: string }

/**
 * Figma "Settings · Integrations" (40000408:8714): one bordered section per
 * integration (GitHub, Notifications, Storybook, Zeroheight, Dual File Mode,
 * AI Agent Assistance, MCP + Code Sync, Jira), plus Storage for the team History,
 * each saving on its own.
 * SettingsScreen places the frame's persona card above and its Team Banner below.
 */
export function SettingsIntegrations({ api, managed, managedBy, brandId }: SettingsIntegrationsProps) {
  const [state, setState] = useState<Load>({ kind: 'loading' })

  useEffect(() => {
    let live = true
    api.load()
      .then((settings) => { if (live) setState({ kind: 'ready', settings, rev: 0 }) })
      .catch((error: unknown) => { if (live) setState({ kind: 'failed', message: error instanceof Error ? error.message : 'Unknown error' }) })
    return () => { live = false }
  }, [api])

  return (
    <div class="bb-integrations" aria-busy={state.kind === 'loading' || undefined}>
      {state.kind === 'loading' && <div class="bb-integrations__loading"><Spinner tone="accent" label="Loading integration settings" /></div>}
      {state.kind === 'failed' && <Notice tone="error" title="Couldn’t load integration settings">{state.message}</Notice>}
      {state.kind === 'ready' && SECTIONS.map((spec) => (
        <IntegrationSection
            key={`${spec.id}:${state.rev}`}
            spec={spec}
            initial={state.settings[spec.id]}
            onSave={async (section, values) => {
              const saved = await api.save(section, values)
              // Keep the copy the other sections read (Storage's status follows GitHub's).
              setState((s) => s.kind === 'ready' ? { ...s, settings: { ...s.settings, [section]: saved } } : s)
              return saved
            }}
            others={state.settings}
            locked={managed?.[spec.id] ? Object.keys(managed[spec.id]!) : undefined}
            lockedBy={managedBy}
            onTest={api.test && TESTABLE_INTEGRATIONS.includes(spec.id) ? api.test : undefined}
            openExternal={api.openExternal ? (url) => { void api.openExternal!(url).catch(() => undefined) } : undefined}
          />
      ))}
      {state.kind === 'ready' && (
        <TeamSetup
          settings={state.settings} brandId={brandId} brandLabel={managedBy} importFile={api.importFile}
          onImported={(settings) => setState((s) => s.kind === 'ready' ? { kind: 'ready', settings, rev: s.rev + 1 } : s)}
        />
      )}
    </div>
  )
}
