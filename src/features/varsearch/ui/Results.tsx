import { VariableCard, VariableCardExpanded, type IconName, type VariableCardRow } from '@shared/ui'
import { usagesLabel, variableMeta } from '../format'
import type { Usage, UsageKind, VariableMatch } from '../messages'

const ROW_ICON: Readonly<Record<UsageKind, IconName>> = {
  component: 'multiple-component',
  frame: 'ui-toolbar-frame',
  'text-style': 'ui-style-text',
}

export interface ResultCardProps {
  variable: VariableMatch
  expanded: boolean
  onToggle: (expanded: boolean) => void
  /** Header research action: select every bound layer. */
  onSelectAll: (variable: VariableMatch) => void
  /** Row "layers show" action. */
  onShowLayers: (usage: Usage) => void
  /** Row "show" action. */
  onGoTo: (usage: Usage) => void
}

/**
 * One searched variable: Figma "Variable search card" collapsed, "Variable
 * search card expand" open — the components, frames and text styles using it,
 * each with Show layers and Go to.
 */
export function ResultCard({ variable: v, expanded, onToggle, onSelectAll, onShowLayers, onGoTo }: ResultCardProps) {
  const kind = v.textLike ? 'text-style' : 'variable'
  const meta = variableMeta(v)
  if (!expanded) {
    return (
      <VariableCard kind={kind} name={v.name} meta={meta} changeCount={v.totalNodes} expanded={false}
        onToggle={onToggle} onInspect={() => onSelectAll(v)} title={v.name} />
    )
  }
  const rows: VariableCardRow[] = v.usages.map((u) => ({
    // A plain string: the card builds the row buttons' accessible names from it.
    label: u.name,
    value: u.count,
    valueLabel: u.kind === 'text-style' ? 'Fields bound' : 'Nodes using',
    icon: ROW_ICON[u.kind],
  }))
  return (
    <VariableCardExpanded
      kind={kind}
      name={v.name}
      meta={meta}
      changeCount={v.totalNodes}
      sectionTitle="Components using this variable"
      summary={[{ label: usagesLabel(v), count: v.usages.length }, { label: 'Nodes', count: v.totalNodes }]}
      rows={rows}
      onCollapse={() => onToggle(false)}
      onInspect={() => onSelectAll(v)}
      onShowLayers={(_, i) => onShowLayers(v.usages[i]!)}
      onShow={(_, i) => onGoTo(v.usages[i]!)}
    />
  )
}
