import type { ComponentChildren, JSX } from 'preact'
import './ChangeStatus.css'

export type ChangeStatusKind = 'updated' | 'added' | 'removed'

const LABEL: Record<ChangeStatusKind, string> = { updated: 'Updated', added: 'Added', removed: 'Removed' }

export interface ChangeStatusProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Property 1": Default = updated, Variant2 = added, Variant3 = removed. */
  status?: ChangeStatusKind
  /** The number shown in the square counter (Figma text layer "52"). */
  count?: number | string
  /** Overrides the "Updated" / "Added" / "Removed" caption. */
  label?: ComponentChildren
}

/** Figma "change status" (86:966): a diff caption ("Updated" / "Added" / "Removed") next to a coloured count square. */
export function ChangeStatus({ status = 'updated', count = 0, label, class: cls, ...rest }: ChangeStatusProps) {
  const caption = label ?? LABEL[status]
  return (
    <span {...rest} class={`bb-change-status ${cls ?? ''}`} data-status={status}>
      <span class="bb-change-status__label">{caption}</span>
      <span class="bb-change-status__count">{count}</span>
    </span>
  )
}
