import { Input, MetaBadge, PublishEmptyState, SectionTitle, Spinner } from '@shared/ui'
import { MCP_SCENARIO_LABEL } from '@shared/integrations'
import { requestSettings } from '@shared/navigation'
import {
  alternateConnections, canCheck, clearSelection, hasSelection, issueError, issueKey, kind, mcpConnected, selectScenario, selection, selectionCount,
  selectionError, selectionPhase, target,
} from '../state'
import { ActionBar } from './ActionBar'
import { Card, ConnectionList, RepositoryList, SCENARIO_TAB, ScenarioSwitch, SelectionLink, type SelectionLinkProps } from './cards'

export interface SelectStepProps extends Pick<SelectionLinkProps, 'onOpenNode' | 'onCopyLink'> {
  /** Next: Check — moves on and runs the checks. */
  onCheck: () => void
  /** Puts the Claude Code / Cursor registration for the Figma MCP server on the clipboard. */
  onCopySetup: () => void
  /** "Use current selection": read the canvas again. Falls back to the fixture in stories. */
  onUseSelection?: () => void
}

function useRemoteServer(): void {
  mcpConnected.value = true
  alternateConnections.value = alternateConnections.value.filter((id) => id !== 'figma')
}

const KIND: Record<string, string> = { COMPONENT_SET: 'Component set', COMPONENT: 'Component', INSTANCE: 'Instance', FRAME: 'Frame', SECTION: 'Section', GROUP: 'Group' }
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function summary(): string {
  const s = selection.value
  if (!mcpConnected.value) return 'Connect the MCP server to start a handoff.'
  if (!target.value.connected) return `Connect a repository to use ${SCENARIO_TAB[kind.value]}.`
  if (selectionPhase.value === 'loading') return 'Reading the selection…'
  if (selectionPhase.value === 'failed') return selectionError.value ?? 'Could not read the selection.'
  if (!s) return 'Nothing selected on the canvas.'
  if (issueError.value) return issueError.value
  const issue = issueKey.value.trim() ? ` · ${issueKey.value.trim()}` : ''
  const extra = selectionCount.value > 1 ? ` · first of ${selectionCount.value} selected` : ''
  return `${s.frame} · ${SCENARIO_TAB[kind.value].toLowerCase()} · goes to ${target.value.repo}${issue}${extra}`
}

/** Figma "MCP v2 · Empty · MCP server not connected". */
function McpServerCard({ onCopySetup }: Pick<SelectStepProps, 'onCopySetup'>) {
  return (
    <Card label="Connections">
      <SectionTitle title="Connections" showCount={false} actionLabel="Manage" onAction={requestSettings} />
      <PublishEmptyState
        state="not-connected"
        icon="mcp"
        title="Connect the Figma MCP server"
        body="Bluebird hands your selection to Claude Code or Cursor through the Figma MCP server. Turn on the desktop server in Figma › Preferences, or use the remote server at mcp.figma.com/mcp — Copy MCP setup gives you the one-line registration."
        actions={[{ label: 'Copy MCP setup', variant: 'secondary', onClick: onCopySetup }, { label: 'Use remote server', variant: 'primary', onClick: useRemoteServer }]}
      />
    </Card>
  )
}

/** Figma "MCP v3 · Library update · Empty · Repository not connected": this scenario has no repository in Settings. */
function RepositoryCard() {
  const label = MCP_SCENARIO_LABEL[kind.value]
  return (
    <Card label={`${SCENARIO_TAB[kind.value]} repository`}>
      <SectionTitle title={`${SCENARIO_TAB[kind.value]} repository`} showCount={false} actionLabel="Manage" onAction={requestSettings} />
      <PublishEmptyState
        state="not-connected"
        icon="mcp"
        title={`Connect a repository for ${label}`}
        body={`${target.value.problem ?? `Add a repository for ${label} in Settings › MCP + code sync`}. The other scenarios are not affected.`}
        actions={[{ label: 'Open Settings', variant: 'primary', onClick: requestSettings }]}
      />
    </Card>
  )
}

function SelectionCard({ onOpenNode, onCopyLink, onUseSelection }: Pick<SelectStepProps, 'onOpenNode' | 'onCopyLink' | 'onUseSelection'>) {
  const s = selection.value
  const useSelection = onUseSelection ?? (() => selectScenario('ready'))
  if (selectionPhase.value === 'loading') {
    return (
      <Card label="Selection">
        <SectionTitle title="Selection" showCount={false} showAction={false} />
        <div class="bb-mcp-handoff__loading" role="status"><Spinner tone="accent" size="sm" label="Reading the selection" /><span class="bb-mcp-handoff__caption">Reading the selection…</span></div>
      </Card>
    )
  }
  if (selectionPhase.value === 'failed') {
    return (
      <Card label="Selection">
        <SectionTitle title="Selection" showCount={false} showAction={false} />
        <PublishEmptyState state="failed" title="Couldn’t read the selection" body={selectionError.value} actions={[{ label: 'Try again', variant: 'primary', onClick: useSelection }]} />
      </Card>
    )
  }
  if (!hasSelection.value || !s) {
    return (
      <Card label="Selection">
        <SectionTitle title="Selection" showCount={false} showAction={false} />
        <PublishEmptyState
          state="no-changes"
          icon="component-select"
          title="Select a frame or component"
          body="Pick one component, component set or screen on the canvas. Bluebird checks it against your design system and writes the prompt Claude Code builds it from."
          actions={[{ label: 'Use current selection', variant: 'secondary', onClick: useSelection }]}
        />
      </Card>
    )
  }
  return (
    <Card label="Selection">
      <SectionTitle title="Selection" count={String(selectionCount.value)} actionLabel="Change" onAction={clearSelection} />
      <SelectionLink selection={s} onOpenNode={onOpenNode} onCopyLink={onCopyLink} />
      <div class="bb-mcp-handoff__options" aria-label="Detected">
        <MetaBadge tone="neutral">{KIND[s.type] ?? s.type.toLowerCase()}</MetaBadge>
        {s.variants > 0 && <MetaBadge tone="neutral">{plural(s.variants, 'variant')}</MetaBadge>}
        {s.properties.length > 0 && <MetaBadge tone="neutral">{plural(s.properties.length, 'property', 'properties')}</MetaBadge>}
        <MetaBadge tone="neutral">{plural(s.layers, 'layer')}</MetaBadge>
      </div>
      <p class="bb-mcp-handoff__caption">
        {s.description || 'No description.'}
        {selectionCount.value > 1 ? ` ${selectionCount.value} layers are selected; the handoff takes the first.` : ''}
      </p>
      <Input
        label="Jira issue (optional)"
        value={issueKey.value}
        placeholder="BB-142"
        helperText={issueError.value ?? 'Goes into the branch name, the prompt and the pull request.'}
        error={issueError.value !== null}
        maxLength={40}
        spellcheck={false}
        autoComplete="off"
        onValueChange={(v) => { issueKey.value = v.toUpperCase() }}
      />
    </Card>
  )
}

/** Figma "MCP v3 · 1 Select" and its empty states (MCP not connected, repository not connected, nothing selected). The library scenario's first step is ChangesStep. */
export function SelectStep({ onOpenNode, onCopyLink, onCheck, onCopySetup, onUseSelection }: SelectStepProps) {
  const setup = { label: 'Copy MCP setup', onClick: onCopySetup }
  const blockedBy = !mcpConnected.value ? 'mcp' : !target.value.connected ? 'repository' : null

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <ScenarioSwitch />
        {blockedBy === 'mcp' && <McpServerCard onCopySetup={onCopySetup} />}
        {blockedBy === 'repository' && <><RepositoryCard /><RepositoryList /></>}
        {blockedBy === null && (
          <>
            <SelectionCard onOpenNode={onOpenNode} onCopyLink={onCopyLink} onUseSelection={onUseSelection} />
            <Card label="Connections">
              <SectionTitle title="Connections" showCount={false} actionLabel="Manage" onAction={requestSettings} />
              <ConnectionList />
            </Card>
          </>
        )}
      </div>
      <ActionBar
        summary={summary()}
        secondary={blockedBy !== null ? [] : hasSelection.value ? [setup, { label: 'Change selection', onClick: clearSelection }] : [setup]}
        primary={{ label: 'Next: Check', disabled: !canCheck.value, onClick: onCheck }}
      />
    </>
  )
}
