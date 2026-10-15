import { PublishEmptyState, SectionTitle, Spinner } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import {
  alternateConnections, canCheck, clearSelection, hasSelection, linkIssue, linkedIssue, mcpConnected, selectScenario, selection, selectionCount,
  selectionError, selectionPhase,
} from '../state'
import { ActionBar } from './ActionBar'
import { Card, ConnectionList, IssueRow, SelectionLink, type SelectionLinkProps } from './cards'

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

const KIND: Record<string, string> = { COMPONENT_SET: 'component set', COMPONENT: 'component', INSTANCE: 'instance', FRAME: 'frame', SECTION: 'section', GROUP: 'group' }

function summary(): string {
  const s = selection.value
  if (!mcpConnected.value) return 'Connect the MCP server to start a handoff.'
  if (selectionPhase.value === 'loading') return 'Reading the selection…'
  if (selectionPhase.value === 'failed') return selectionError.value ?? 'Could not read the selection.'
  if (!s) return 'Nothing selected on the canvas.'
  if (!linkedIssue.value) return 'Link a Jira issue to continue.'
  const extra = selectionCount.value > 1 ? ` · first of ${selectionCount.value} selected` : ''
  return `${s.frame} · ${s.path.split(' · ').pop()} · linked to ${linkedIssue.value.key}${extra}`
}

/** Figma "MCP v2 · 1 Select" and its empty states (MCP not connected, Nothing selected, No Jira issue). */
export function SelectStep({ onOpenNode, onCopyLink, onCheck, onCopySetup, onUseSelection }: SelectStepProps) {
  const s = selection.value
  const issue = linkedIssue.value
  const useSelection = onUseSelection ?? (() => selectScenario('ready'))
  const setup = { label: 'Copy MCP setup', onClick: onCopySetup }

  if (!mcpConnected.value) {
    return (
      <>
        <div class="bb-mcp-handoff__panels">
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
        </div>
        <ActionBar summary={summary()} primary={{ label: 'Next: Check', disabled: true }} />
      </>
    )
  }

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Selection">
          {selectionPhase.value === 'loading' ? (
            <>
              <SectionTitle title="Selection" showCount={false} showAction={false} />
              <div class="bb-mcp-handoff__loading" role="status"><Spinner tone="accent" size="sm" label="Reading the selection" /><span class="bb-mcp-handoff__caption">Reading the selection…</span></div>
            </>
          ) : selectionPhase.value === 'failed' ? (
            <>
              <SectionTitle title="Selection" showCount={false} showAction={false} />
              <PublishEmptyState state="failed" title="Couldn’t read the selection" body={selectionError.value} actions={[{ label: 'Try again', variant: 'primary', onClick: useSelection }]} />
            </>
          ) : hasSelection.value && s ? (
            <>
              <SectionTitle title="Selection" count={String(selectionCount.value)} actionLabel="Change" onAction={clearSelection} />
              <SelectionLink selection={s} onOpenNode={onOpenNode} onCopyLink={onCopyLink} />
              <p class="bb-mcp-handoff__caption">
                {KIND[s.type] ?? s.type.toLowerCase()} · {s.layers} {s.layers === 1 ? 'layer' : 'layers'}
                {s.description ? ` · ${s.description}` : ' · no description'}
                {selectionCount.value > 1 ? ` · ${selectionCount.value} layers are selected; the handoff takes the first` : ''}
              </p>
              <SectionTitle title="Linked Jira issue" showCount={false} showAction={issue !== null} actionLabel="Change" />
              {issue ? <IssueRow issue={issue} /> : (
                <PublishEmptyState
                  state="no-changes"
                  icon="jira"
                  title="Link a Jira issue"
                  body="Every handoff needs a Jira issue so the branch, commit and pull request can reference it. Pick an issue, or create one from this selection."
                  actions={[{ label: 'Link issue', variant: 'secondary', onClick: linkIssue }]}
                />
              )}
            </>
          ) : (
            <>
              <SectionTitle title="Selection" showCount={false} showAction={false} />
              <PublishEmptyState
                state="no-changes"
                icon="component-select"
                title="Select a frame or component"
                body="Pick one frame, component or component set on the canvas. Bluebird checks it against your design system, writes the Claude Code prompt and ships the result to Git."
                actions={[{ label: 'Use current selection', variant: 'secondary', onClick: useSelection }]}
              />
            </>
          )}
        </Card>
        <Card label="Connections">
          <SectionTitle title="Connections" showCount={false} actionLabel="Manage" onAction={requestSettings} />
          <ConnectionList />
        </Card>
      </div>
      <ActionBar
        summary={summary()}
        secondary={hasSelection.value ? [setup, { label: 'Change selection', onClick: clearSelection }] : [setup]}
        primary={{ label: 'Next: Check', disabled: !canCheck.value, onClick: onCheck }}
      />
    </>
  )
}
