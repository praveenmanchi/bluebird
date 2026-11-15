import type { ComponentChildren } from 'preact'
import { ConnectionRow, FigmaLinkCard, SectionTitle, SegmentedControl, type IconName } from '@shared/ui'
import { MCP_SCENARIOS, MCP_SCENARIO_LABEL, type McpScenario } from '@shared/integrations'
import { requestSettings } from '@shared/navigation'
import { CONNECTIONS } from '../fixtures'
import type { SelectionInfo } from '../messages'
import { alternateConnections, kind, setKind, target, targets } from '../state'

/** One mcp/surface/panel card in the scrolling column (Figma "Selection", "Connections", …). */
export function Card({ label, children }: { label: string; children: ComponentChildren }) {
  return <section class="bb-mcp-handoff__card" aria-label={label}>{children}</section>
}

/** The switch's short names; Settings and the prompt use MCP_SCENARIO_LABEL. */
export const SCENARIO_TAB: Readonly<Record<McpScenario, string>> = { component: 'Component', screen: 'Screen', library: 'Library update' }
const SCENARIO_ICON: Readonly<Record<McpScenario, IconName>> = { component: 'ui-toolbar-component', screen: 'ui-toolbar-frame', library: 'ui-sidebar-libraries' }

/** Figma "Scenario": Component / Screen / Library update. It follows the selection; picking one overrides that. */
export function ScenarioSwitch() {
  return (
    <SegmentedControl
      class="bb-mcp-handoff__files"
      aria-label="Scenario"
      options={MCP_SCENARIOS.map((id) => ({ value: id, label: SCENARIO_TAB[id], icon: SCENARIO_ICON[id] }))}
      value={kind.value}
      onChange={setKind}
    />
  )
}

function toggleConnection(id: (typeof CONNECTIONS)[number]['id']): void {
  const current = alternateConnections.value
  alternateConnections.value = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
}

/** Figma "Connections" rows: the Figma MCP server (remote ↔ local) and the scenario's repository from Settings › MCP + code sync. */
export function ConnectionList() {
  const repo = target.value
  return (
    <div class="bb-mcp-handoff__stack">
      {CONNECTIONS.map((c) => {
        const alt = alternateConnections.value.includes(c.id) ? c.alternate : undefined
        return (
          <ConnectionRow
            key={c.id}
            name={c.name}
            detail={alt?.detail ?? c.detail}
            actionLabel={alt?.actionLabel ?? c.actionLabel}
            status={c.status}
            onAction={() => toggleConnection(c.id)}
          />
        )
      })}
      <ConnectionRow
        name={`${SCENARIO_TAB[kind.value]} repository`}
        detail={repo.connected ? `${repo.repo} · base ${repo.branch}` : (repo.problem ?? 'Not connected')}
        actionLabel={repo.connected ? 'Change' : 'Set up'}
        status={repo.connected ? 'good' : 'issue'}
        onAction={requestSettings}
      />
    </div>
  )
}

/** Figma "Repositories by scenario": every scenario's repository, so a team sees which ones are theirs to set up. */
export function RepositoryList() {
  return (
    <Card label="Repositories by scenario">
      <SectionTitle title="Repositories by scenario" showCount={false} actionLabel="Manage" onAction={requestSettings} />
      <ul class="bb-mcp-handoff__stack">
        {MCP_SCENARIOS.map((id) => {
          const t = targets.value[id]
          return (
            <li key={id}>
              <ConnectionRow
                name={MCP_SCENARIO_LABEL[id]}
                detail={t.connected ? `${t.repo} · base ${t.branch}` : 'Not connected'}
                status={t.connected ? 'good' : 'issue'}
                showAction={!t.connected}
                actionLabel="Set up"
                onAction={requestSettings}
              />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export interface SelectionLinkProps {
  selection: SelectionInfo
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
