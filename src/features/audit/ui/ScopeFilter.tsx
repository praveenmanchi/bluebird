import { useEffect, useRef, useState } from 'preact/hooks'
import { DropdownMenu, MenuItem, PageFilter } from '@shared/ui'
import { scopeButtonLabel, togglePage } from '../format'
import type { PageInfo, Scope } from '../messages'

export interface ScopeFilterProps {
  pages: readonly PageInfo[]
  selected: number
  scope: Scope
  disabled?: boolean
  onChange: (scope: Scope) => void
}

/** Figma "pages" trigger + Scope menu: the selection, this page, or chosen pages. */
export function ScopeFilter({ pages, selected, scope, disabled, onChange }: ScopeFilterProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div class="bb-audit__filter" ref={root}>
      <PageFilter label={scopeButtonLabel(scope, pages)} open={open} disabled={disabled} aria-controls="bb-audit-scope" onClick={() => setOpen((o) => !o)} />
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
