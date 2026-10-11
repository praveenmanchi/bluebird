import type { JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { DropdownMenu, MenuItem, SelectField, type IconName } from '@shared/ui'

export interface SelectInputProps {
  label: string
  icon: IconName
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  disabled?: boolean
}

const NEXT: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_i, n) => n - 1,
}

/**
 * Figma "dropbox" (SelectField with label) over a DropdownMenu of MenuItems.
 * Opening focuses the selected option; arrows / Home / End move between
 * options; Escape, a pick, an outside click or tabbing away closes it.
 */
export function SelectInput({ label, icon, value, options, onChange, disabled }: SelectInputProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const optionEls = () => [...(root.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) root.current?.querySelector<HTMLButtonElement>('.bb-select-field__trigger')?.focus()
  }

  useEffect(() => {
    if (!open) return
    const items = optionEls()
    ;(items.find((el) => el.getAttribute('aria-selected') === 'true') ?? items[0])?.focus()
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); close(true); return }
    const move = NEXT[e.key]
    if (!move) return
    e.preventDefault()
    const items = optionEls()
    const at = items.indexOf(document.activeElement as HTMLElement)
    items[move(Math.max(at, 0), items.length)]?.focus()
  }
  const onFocusOut = (e: JSX.TargetedFocusEvent<HTMLDivElement>) => {
    if (open && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <div ref={root} class="bb-integrations__select" onKeyDown={onKeyDown} onFocusOut={onFocusOut}>
      <SelectField label={label} labelIcon={icon} value={value} open={open} disabled={disabled} onClick={() => setOpen((o) => !o)} />
      {open && (
        <DropdownMenu class="bb-integrations__menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <MenuItem key={option} label={option} selected={option === value} onSelect={() => { onChange(option); close(true) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
