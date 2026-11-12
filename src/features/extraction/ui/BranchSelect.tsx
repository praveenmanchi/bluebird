import { useEffect, useRef, useState } from 'preact/hooks'
import { Dropdown, DropdownMenu, MenuItem } from '@shared/ui'
import type { BranchInfo } from '../messages'
import { stampLabel } from '../format'

export interface BranchSelectProps {
  /** Accessible name, and the text before the branch in the trigger: "Compare with", "Target branch". */
  label: string
  value: string | null
  branches: readonly BranchInfo[]
  onChange: (branch: string) => void
  /** An extra last item, e.g. "+ Create new branch". */
  extra?: { label: string; onSelect: () => void }
  disabled?: boolean
}

/**
 * Figma "Extraction v2 · 2 Pick a branch": a Dropdown whose menu lists every branch
 * with who took its latest extraction and when.
 */
export function BranchSelect({ label, value, branches, onChange, extra, disabled }: BranchSelectProps) {
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
    <div ref={root} class="bb-extraction__select">
      <Dropdown aria-label={label} value={value ? `${label}: ${value}` : undefined} placeholder={`${label}…`} open={open} disabled={disabled} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-extraction__menu" aria-label={label}>
          {branches.map((b) => (
            <MenuItem key={b.name} icon="branch" label={b.name} count={stampLabel(b.latest)} selected={b.name === value} onSelect={() => { onChange(b.name); setOpen(false) }} />
          ))}
          {extra && <MenuItem icon="branch" label={extra.label} onSelect={() => { extra.onSelect(); setOpen(false) }} />}
        </DropdownMenu>
      )}
    </div>
  )
}
