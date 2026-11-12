import { useEffect, useRef, useState } from 'preact/hooks'
import { Dropdown, DropdownMenu, MenuItem } from '@shared/ui'
import { RANGES, type RangeDays } from '../messages'

export interface RangeSelectProps {
  value: RangeDays
  onChange: (days: RangeDays) => void
  disabled?: boolean
}

const label = (d: RangeDays) => `Last ${d} days`

/** Figma "History · 1 Timeline" › date range: a Dropdown with Last 7 / 30 / 90 days. */
export function RangeSelect({ value, onChange, disabled }: RangeSelectProps) {
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
    <div ref={root} class="bb-history__range">
      <Dropdown aria-label="Date range" value={label(value)} open={open} disabled={disabled} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-history__menu" aria-label="Date range">
          {RANGES.map((d) => <MenuItem key={d} label={label(d)} selected={d === value} onSelect={() => { onChange(d); setOpen(false) }} />)}
        </DropdownMenu>
      )}
    </div>
  )
}
