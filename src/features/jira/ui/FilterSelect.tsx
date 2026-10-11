import { useCallback, useRef, useState } from 'preact/hooks'
import { Dropdown, DropdownMenu, MenuItem } from '@shared/ui'
import { useDismiss } from './useDismiss'

export interface FilterOption<T extends string> {
  value: T
  /** Menu row text. */
  label: string
  /** Trigger text when this option is chosen (Figma "Status: All"); defaults to `label`. */
  display?: string
}

export interface FilterSelectProps<T extends string> {
  /** Accessible name of the trigger and the listbox. */
  label: string
  value: T
  options: readonly FilterOption<T>[]
  onChange: (value: T) => void
  class?: string
}

/** A Figma "Dropdown" trigger with a DropdownMenu of single-select MenuItems. */
export function FilterSelect<T extends string>({ label, value, options, onChange, class: cls }: FilterSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(root, open, close)

  const current = options.find((o) => o.value === value)
  return (
    <div ref={root} class={`bb-jira-popover ${cls ?? ''}`}>
      <Dropdown aria-label={label} value={current?.display ?? current?.label} open={open} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-jira-popover__menu" aria-label={label}>
          {options.map((o) => (
            <MenuItem key={o.value} label={o.label} selected={o.value === value} onSelect={() => { onChange(o.value); setOpen(false) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
