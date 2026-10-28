import { useEffect, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { DropdownMenu, FilterDropdown, MenuItem, PageFilter } from '@shared/ui'
import { isPageTicked, KIND_LABEL, pageScopeLabel, togglePage, toggleType, typesLabel, type PageScope } from '../format'
import { USAGE_KINDS, type PageInfo, type UsageKind } from '../messages'

/** Open/close state for a trigger + menu pair; closes on an outside press or Escape. */
function useMenu() {
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
  return { open, toggle: () => setOpen((o) => !o), root }
}

function Popover({ id, label, children }: { id: string; label: string; children: ComponentChildren }) {
  return <DropdownMenu id={id} aria-label={label} aria-multiselectable="true" class="bb-varsearch__menu">{children}</DropdownMenu>
}

export interface PagesFilterProps {
  pages: readonly PageInfo[]
  currentPageId: string
  scope: PageScope
  disabled?: boolean
  onChange: (scope: PageScope) => void
}

/** Figma "pages" trigger + Pages menu: All Pages, Current page only, then every page. */
export function PagesFilter({ pages, currentPageId, scope, disabled, onChange }: PagesFilterProps) {
  const menu = useMenu()
  const allIds = pages.map((p) => p.id)
  return (
    <div class="bb-varsearch__filter" ref={menu.root}>
      <PageFilter label={pageScopeLabel(scope, pages)} open={menu.open} disabled={disabled} aria-haspopup="listbox" aria-controls="bb-varsearch-pages" onClick={menu.toggle} />
      {menu.open && (
        <Popover id="bb-varsearch-pages" label="Pages to search">
          <MenuItem mode="multi" label={`All Pages (${pages.length})`} selected={scope.mode === 'all'} onSelect={() => onChange({ mode: 'all' })} />
          <MenuItem mode="multi" label="Current page only" selected={scope.mode === 'current'} disabled={!currentPageId} onSelect={() => onChange({ mode: 'current' })} />
          <DropdownMenu.Divider />
          {pages.map((p) => (
            <MenuItem key={p.id} mode="multi" label={p.name} selected={isPageTicked(scope, p.id, currentPageId)}
              onSelect={() => onChange(togglePage(scope, p.id, allIds, currentPageId))} />
          ))}
        </Popover>
      )}
    </div>
  )
}

export interface TypesFilterProps {
  types: readonly UsageKind[]
  disabled?: boolean
  onChange: (types: UsageKind[]) => void
}

/** Figma "filters" trigger + Type menu: All types, Frame, Component, Text style. */
export function TypesFilter({ types, disabled, onChange }: TypesFilterProps) {
  const menu = useMenu()
  return (
    <div class="bb-varsearch__filter" ref={menu.root}>
      <FilterDropdown open={menu.open} disabled={disabled} aria-haspopup="listbox" aria-controls="bb-varsearch-types" onClick={menu.toggle}>
        {typesLabel(types)}
      </FilterDropdown>
      {menu.open && (
        <Popover id="bb-varsearch-types" label="Where to look">
          <MenuItem mode="multi" label="All types" selected={types.length === 0} onSelect={() => onChange([])} />
          <DropdownMenu.Divider />
          {USAGE_KINDS.map((k) => (
            <MenuItem key={k} mode="multi" label={KIND_LABEL[k].one} selected={types.includes(k)} onSelect={() => onChange(toggleType(types, k, USAGE_KINDS))} />
          ))}
        </Popover>
      )}
    </div>
  )
}
