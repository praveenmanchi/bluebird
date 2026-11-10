import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, DropdownMenu, MenuItem, type IconName } from '@shared/ui'

export type ExportFormat = 'json' | 'markdown' | 'figma-report' | 'developer-spec'

const OPTIONS: readonly (readonly [ExportFormat, string, IconName])[] = [
  ['json', 'JSON', 'ui-text-code-block'],
  ['markdown', 'Markdown', 'ui-general-show-as-list'],
  ['figma-report', 'Figma report', 'ui-sidebar-figma-logo'],
  ['developer-spec', 'Developer spec', 'ui-general-mark-as-ready-for-dev'],
]

export interface ExportMenuProps {
  onExport: (format: ExportFormat) => void
  /** A canvas document is being drawn. */
  busy?: boolean
}

/**
 * Figma "Accessibility M · Results · Export menu" (40002658:26652): a secondary Export
 * button with a dropdown arrow beside the finding filters. Esc closes the menu and puts
 * focus back on the button.
 */
export function ExportMenu({ onExport, busy = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  // Button does not forward refs; the trigger is the wrapper's first button.
  const focusTrigger = () => root.current?.querySelector<HTMLButtonElement>('button')?.focus()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); focusTrigger() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // Focus the first option so the keyboard can pick straight away.
    root.current?.querySelector<HTMLElement>('[role="option"]')?.focus()
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const choose = (format: ExportFormat) => {
    setOpen(false)
    focusTrigger()
    onExport(format)
  }

  return (
    <div ref={root} class="bb-a11y__export-menu">
      <Button
        variant="secondary"
        trailingIcon="ui-sidebar-dropdown"
        loading={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Export report"
        onClick={() => setOpen(!open)}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) } }}
      >
        Export
      </Button>
      {open && (
        <DropdownMenu class="bb-a11y__export-options" aria-label="Export as">
          {OPTIONS.map(([format, label, icon]) => (
            <MenuItem key={format} label={label} icon={icon} onSelect={() => choose(format)} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
