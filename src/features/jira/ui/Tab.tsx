import { useEffect, useState } from 'preact/hooks'
import { JiraEmptyState, Spinner, useRpc } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { loadBoard } from '../actions'
import { connection, loadError, reset, settingsProblem, type Connection } from '../state'
import { JiraBoard } from './JiraBoard'
import './jira.css'

export interface TabProps {
  /** Start in this state without calling Jira (stories, tests). The shell renders the tab without props. */
  initialConnection?: Exclude<Connection, 'loading'>
}

/** Not connected body: Jira switched off, fields missing, or fields Settings would not accept. */
function notConnectedBody({ reason, fields }: { reason: 'disabled' | 'incomplete' | 'invalid'; fields: readonly string[] }): string {
  if (reason === 'disabled') return 'Jira is switched off. Turn on Jira Integration in Settings, then add your site, email and API token.'
  if (reason === 'invalid') return `Fix the ${fields.join(', ')} in Settings › Jira Integration.`
  return `Add your ${fields.join(', ')} in Settings › Jira Integration to pull the tickets assigned to you.`
}

/**
 * Jira board tab. Loads the board from Jira (through the sandbox) on open:
 * Loading → the board ("Jira UI"), "Jira UI · Not connected" or "Jira UI · Error".
 */
export function JiraTab({ initialConnection }: TabProps) {
  const rpc = useRpc()
  useState(() => { if (initialConnection) connection.value = initialConnection })
  useEffect(() => {
    if (!initialConnection) void loadBoard(rpc)
    return () => reset()
  }, [])

  const state = connection.value
  if (state === 'connected') return <JiraBoard />
  if (state === 'loading') {
    return (
      <div class="bb-jira-state" role="status" aria-live="polite">
        <Spinner tone="accent" size="lg" label="Loading your Jira tickets" />
      </div>
    )
  }
  return (
    <div class="bb-jira-state">
      {state === 'error'
        ? <JiraEmptyState state="error" onAction={() => { void loadBoard(rpc) }}>{loadError.value ?? undefined}</JiraEmptyState>
        : <JiraEmptyState state="not-connected" actionLabel="Open Settings" onAction={requestSettings}>{initialConnection ? undefined : notConnectedBody(settingsProblem.value)}</JiraEmptyState>}
    </div>
  )
}

/** Shell entry: the registry renders tabs without props. */
export function Tab() {
  return <JiraTab />
}
