import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, ContextChip, Dropdown, DropdownMenu, Icon, MenuItem, ProgressBar, Spinner } from '@shared/ui'
import { progress } from '../state'

export interface ActionBarAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

export interface ActionBarProps {
  summary: ComponentChildren
  secondary?: ActionBarAction
  primary?: ActionBarAction
}

/** Figma "Actions": what will happen, then the secondary and primary buttons. */
export function ActionBar({ summary, secondary, primary }: ActionBarProps) {
  return (
    <div class="bb-docs__actions">
      <p class="bb-docs__summary" aria-live="polite">{summary}</p>
      {secondary && <Button variant="secondary" width="fixed" disabled={secondary.disabled} onClick={secondary.onClick}>{secondary.label}</Button>}
      {primary && <Button variant="primary" width="fixed" disabled={primary.disabled} onClick={primary.onClick}>{primary.label}</Button>}
    </div>
  )
}

export interface ProgressViewProps {
  /** The Context Chip: what is being documented. */
  subject: string
  title: string
  /** Shown until the sandbox streams its first steps. */
  waiting: string
}

/** Figma "3 Generating" / "5 Generating": the subject, the steps as they finish, and a bar. */
export function ProgressView({ subject, title, waiting }: ProgressViewProps) {
  const steps = progress.value
  const done = steps.filter((s) => s.status === 'done').length
  const percent = steps.length ? ((done + 0.5) / steps.length) * 100 : 5
  return (
    <section class="bb-docs__card bb-docs__card--fill" role="status" aria-label={title}>
      <ContextChip type="selection" class="bb-docs__subject">{subject}</ContextChip>
      <h3 class="bb-docs__heading">{title}</h3>
      <ul class="bb-docs__steps">
        {(steps.length ? steps : [{ label: waiting, status: 'running' as const }]).map((s) => (
          <li key={s.label} data-status={s.status}>
            {s.status === 'running' ? <Spinner tone="accent" size="sm" label="In progress" /> : <Icon name="status-good" class="bb-docs__step-icon" aria-hidden="true" />}
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
      <ProgressBar value={percent} tone="success" aria-label={`${title}: step ${Math.min(done + 1, Math.max(1, steps.length))} of ${Math.max(1, steps.length)}`} />
    </section>
  )
}

/** "Step 4 of 5" for the action bar while a run streams. */
export function stepSummary(): string {
  const steps = progress.value
  if (!steps.length) return 'Starting…'
  return `Step ${Math.min(steps.filter((s) => s.status === 'done').length + 1, steps.length)} of ${steps.length}`
}

export interface SelectProps {
  /** Accessible name of the trigger and its listbox. */
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}

/** A Dropdown trigger over a DropdownMenu of MenuItems; closes on outside press and Escape. */
export function Select({ label, value, options, onChange }: SelectProps) {
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
    <div ref={root} class="bb-docs__select">
      <Dropdown aria-label={label} value={value} open={open} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-docs__menu" aria-label={label}>
          {options.map((option) => (
            <MenuItem key={option} label={option} selected={option === value} onSelect={() => { onChange(option); setOpen(false) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
