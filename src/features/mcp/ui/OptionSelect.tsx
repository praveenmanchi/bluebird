import { useEffect, useRef, useState } from 'preact/hooks'
import { Dropdown, DropdownMenu, MenuItem } from '@shared/ui'

export interface OptionSelectProps {
  /** Accessible name of the trigger and its listbox. */
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}

/** One "Options" dropdown of the Generate code panel: a Dropdown trigger over a DropdownMenu of MenuItems. */
export function OptionSelect({ label, value, options, onChange }: OptionSelectProps) {
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
    <div ref={root} class="bb-mcp-handoff__select">
      <Dropdown aria-label={label} value={value} open={open} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-mcp-handoff__menu" aria-label={label}>
          {options.map((option) => (
            <MenuItem key={option} label={option} selected={option === value} onSelect={() => { onChange(option); setOpen(false) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
