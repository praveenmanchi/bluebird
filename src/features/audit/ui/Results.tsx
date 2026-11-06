import { VariableCard, VariableCardExpanded } from '@shared/ui'
import { isValue, itemMeta, pagesOf } from '../format'
import type { AuditItem, Place } from '../messages'

export interface ItemCardProps {
  item: AuditItem
  expanded: boolean
  onToggle: (expanded: boolean) => void
  onSelect: (nodeIds: readonly string[], label: string) => void
  onGoTo: (place: Place) => void
}

/** One issue: Figma "Variable search card" collapsed, "… expand" open, like Variable search. */
export function ItemCard({ item, expanded, onToggle, onSelect, onGoTo }: ItemCardProps) {
  const meta = itemMeta(item)
  const kind = isValue(item) ? 'variable' : 'component'
  const selectAll = () => onSelect(item.places.flatMap((p) => p.nodeIds), item.name)
  if (!expanded) {
    return <VariableCard kind={kind} name={item.name} meta={meta} changeCount={item.count} changeLabel="Layers" onToggle={onToggle} onInspect={selectAll} title={item.name} />
  }
  return (
    <VariableCardExpanded
      kind={kind} name={item.name} meta={meta} changeCount={item.count} changeLabel="Layers"
      sectionTitle="Where it is used"
      summary={[{ label: 'Pages', count: pagesOf(item) }, { label: 'Layers', count: item.count }]}
      rows={item.places.map((p) => ({ label: p.name, value: p.nodeIds.length, valueLabel: 'Layers', icon: 'ui-toolbar-frame' }))}
      onCollapse={() => onToggle(false)} onInspect={selectAll}
      onShowLayers={(_, i) => { const p = item.places[i]!; onSelect(p.nodeIds, p.name) }}
      onShow={(_, i) => onGoTo(item.places[i]!)}
    />
  )
}
