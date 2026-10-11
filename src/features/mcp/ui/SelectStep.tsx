import { PublishEmptyState, SectionTitle } from '@shared/ui'
import {
  alternateConnections, canCheck, clearSelection, goTo, hasSelection, linkIssue, linkedIssue, mcpConnected, scenario, selectScenario,
} from '../state'
import { ActionBar } from './ActionBar'
import { Card, ConnectionList, IssueRow, SelectionLink, type SelectionLinkProps } from './cards'

export type SelectStepProps = Pick<SelectionLinkProps, 'onOpenNode' | 'onCopyLink'>

function useRemoteServer(): void {
  mcpConnected.value = true
  alternateConnections.value = alternateConnections.value.filter((id) => id !== 'figma')
}

function summary(): string {
  if (!mcpConnected.value) return 'Connect the MCP server to start a handoff.'
  if (!hasSelection.value) return 'Nothing selected on the canvas.'
  if (!linkedIssue.value) return 'Link a Jira issue to continue.'
  return `${scenario.value.selection.frame} · ${scenario.value.selection.path.split(' · ').pop()} · linked to ${linkedIssue.value.key}`
}

/** Figma "MCP v2 · 1 Select" and its empty states (MCP not connected, Nothing selected, No Jira issue). */
export function SelectStep({ onOpenNode, onCopyLink }: SelectStepProps) {
  const s = scenario.value
  const issue = linkedIssue.value

  if (!mcpConnected.value) {
    return (
      <>
        <div class="bb-mcp-handoff__panels">
          <Card label="Connections">
            <SectionTitle title="Connections" showCount={false} actionLabel="Manage" />
            <PublishEmptyState
              state="not-connected"
              icon="mcp"
              title="Connect the Figma MCP server"
              body="Bluebird hands your selection to Claude Code or Cursor through the Figma MCP server. Turn on the desktop server in Figma › Preferences, or use the remote server at mcp.figma.com/mcp."
              actions={[{ label: 'Use remote server', variant: 'primary', onClick: useRemoteServer }]}
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
          {hasSelection.value ? (
            <>
              <SectionTitle title="Selection" count="1" actionLabel="Change" onAction={clearSelection} />
              <SelectionLink selection={s.selection} onOpenNode={onOpenNode} onCopyLink={onCopyLink} />
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
                body="Pick one frame, component or component set on the canvas. Bluebird checks it against your design system, generates code and ships it to Git."
                actions={[{ label: 'Use current selection', variant: 'secondary', onClick: () => selectScenario(s.id) }]}
              />
            </>
          )}
        </Card>
        <Card label="Connections">
          <SectionTitle title="Connections" showCount={false} actionLabel="Manage" />
          <ConnectionList />
        </Card>
      </div>
      <ActionBar
        summary={summary()}
        secondary={hasSelection.value ? [{ label: 'Change selection', onClick: clearSelection }] : []}
        primary={{ label: 'Next: Check', disabled: !canCheck.value, onClick: () => goTo(1) }}
      />
    </>
  )
}
