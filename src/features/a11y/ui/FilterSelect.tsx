import { useEffect, useRef, useState } from 'preact/hooks'
import { Dropdown, DropdownMenu, MenuItem } from '@shared/ui'

export interface FilterOption<T extends string> { value: T; label: string }

export interface FilterSelectProps<T extends string> {
  label: string
  value: T
  options: readonly FilterOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

/** One toolbar filter of the Figma "accessibity UI" screen: a Dropdown trigger with a DropdownMenu of MenuItems. */
export function FilterSelect<T extends string>({ label, value, options, onChange, disabled }: FilterSelectProps<T>) {
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

  const current = options.find((o) => o.value === value)
  return (
    <div ref={root} class="bb-a11y__filter">
      <Dropdown aria-label={label} value={current?.label} open={open} disabled={disabled} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-a11y__menu" aria-label={label}>
          {options.map((o) => (
            <MenuItem key={o.value} label={o.label} selected={o.value === value} onSelect={() => { onChange(o.value); setOpen(false) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
