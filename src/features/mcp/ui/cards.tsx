import type { ComponentChildren } from 'preact'
import { ConnectionRow, FigmaLinkCard, TicketRow } from '@shared/ui'
import { CONNECTIONS, type HandoffIssue, type HandoffSelection } from '../fixtures'
import { alternateConnections } from '../state'

/** One mcp/surface/panel card in the scrolling column (Figma "Selection", "Connections", …). */
export function Card({ label, children }: { label: string; children: ComponentChildren }) {
  return <section class="bb-mcp-handoff__card" aria-label={label}>{children}</section>
}

function toggleConnection(id: (typeof CONNECTIONS)[number]['id']): void {
  const current = alternateConnections.value
  alternateConnections.value = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
}

/** Figma "Connections" rows: the Figma MCP server (remote ↔ local) and GitHub. */
export function ConnectionList() {
  return (
    <div class="bb-mcp-handoff__stack">
      {CONNECTIONS.map((c) => {
        const alt = c.alternate && alternateConnections.value.includes(c.id) ? c.alternate : undefined
        return (
          <ConnectionRow
            key={c.id}
            name={c.name}
            detail={alt?.detail ?? c.detail}
            actionLabel={alt?.actionLabel ?? c.actionLabel}
            status={c.status}
            onAction={c.alternate ? () => toggleConnection(c.id) : undefined}
          />
        )
      })}
    </div>
  )
}

export interface SelectionLinkProps {
  selection: HandoffSelection
  onOpenNode?: (nodeId: string) => void
  onCopyLink?: (nodeId: string) => void
}

export function SelectionLink({ selection, onOpenNode, onCopyLink }: SelectionLinkProps) {
  return (
    <FigmaLinkCard
      frame={selection.frame}
      path={selection.path}
      onOpen={() => onOpenNode?.(selection.nodeId)}
      onCopy={() => onCopyLink?.(selection.nodeId)}
    />
  )
}

export function IssueRow({ issue }: { issue: HandoffIssue }) {
  return (
    <TicketRow
      issueKey={issue.key}
      title={issue.title}
      issueType={issue.issueType}
      status={issue.status}
      statusTone={issue.statusTone}
      priority={issue.priority}
      points={issue.points}
      assignee={issue.assignee}
      assigneeName={issue.assigneeName}
    />
  )
}
