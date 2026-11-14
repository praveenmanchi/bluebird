import { useCallback, useRef } from 'preact/hooks'
import { DropdownMenu, MenuItem, PageFilter } from '@shared/ui'
import { scopeButtonLabel, togglePage } from '../format'
import type { PageInfo, Scope } from '../messages'
import { useDismiss } from './useDismiss'

export interface ScopeFilterProps {
  pages: readonly PageInfo[]
  selected: number
  scope: Scope
  /** The tab owns this: the Ready screen's "Chosen pages" card opens the same menu. */
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  onChange: (scope: Scope) => void
}

/** Figma "pages" trigger + Scope menu: the selection, this page, or chosen pages. */
export function ScopeFilter({ pages, selected, scope, open, onOpenChange, disabled, onChange }: ScopeFilterProps) {
  const root = useRef<HTMLDivElement>(null)
  const close = useCallback(() => onOpenChange(false), [onOpenChange])
  useDismiss(root, open, close)
  return (
    <div class="bb-audit__filter" ref={root}>
      <PageFilter label={scopeButtonLabel(scope, pages)} open={open} disabled={disabled} aria-controls="bb-audit-scope" onClick={() => onOpenChange(!open)} />
      {open && (
        <DropdownMenu id="bb-audit-scope" class="bb-audit__menu" aria-label="What to audit" aria-multiselectable="true">
          <MenuItem mode="multi" label={`Selection (${selected})`} selected={scope.mode === 'selection'} disabled={!selected} onSelect={() => onChange({ mode: 'selection' })} />
          <MenuItem mode="multi" label="Current page" selected={scope.mode === 'current'} onSelect={() => onChange({ mode: 'current' })} />
          <DropdownMenu.Divider />
          {pages.map((p) => (
            <MenuItem key={p.id} mode="multi" label={p.name} selected={scope.mode === 'pages' && scope.pageIds.includes(p.id)} onSelect={() => onChange(togglePage(scope, p.id))} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
