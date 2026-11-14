import { useCallback, useRef, useState } from 'preact/hooks'
import { DropdownMenu, FilterDropdown, MenuItem } from '@shared/ui'
import type { View } from '../state'
import { useDismiss } from './useDismiss'

export const VIEWS: readonly { value: View; label: string }[] = [{ value: 'scope', label: 'This scope' }, { value: 'files', label: 'Across files' }]

export interface ViewMenuProps {
  view: View
  disabled?: boolean
  onChange: (view: View) => void
}

/** Figma "view" dropdown in the Audit toolbar: this scope's audit, or the libraries across files. */
export function ViewMenu({ view, disabled, onChange }: ViewMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(root, open, close)
  const current = VIEWS.find((v) => v.value === view) ?? VIEWS[0]!
  return (
    <div class="bb-audit__view" ref={root}>
      <FilterDropdown icon={false} open={open} disabled={disabled} aria-label={`View: ${current.label}`} aria-controls="bb-audit-view" onClick={() => setOpen((o) => !o)}>{current.label}</FilterDropdown>
      {open && (
        <DropdownMenu id="bb-audit-view" class="bb-audit__menu" aria-label="View">
          {VIEWS.map((v) => (
            <MenuItem key={v.value} mode="single" label={v.label} selected={v.value === view} onSelect={() => { onChange(v.value); setOpen(false) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
