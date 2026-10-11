// Small tab-local compositions shared by several Agents screens. Layout and
// tokens stay in each screen's CSS (the class is passed in), so every screen's
// stylesheet still reads what its own Figma frame binds.
import { LinkButton, SegmentTab, type IconName } from '@shared/ui'

export interface SelecterRowProps<T extends string> {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the tablist. */
  label: string
  /** The "Tab Icons" glyph each Figma "Tab selecters" instance shows. */
  icon?: IconName
  class?: string
}

/**
 * A row of loose Figma "Tab selecters" instances (scope, mode, severity filters).
 * Not the Group Tab selecters track: the screens place the segments straight in an
 * auto-layout row, so this is SegmentTab in a tablist with arrow-key movement.
 */
export function SelecterRow<T extends string>({ options, value, onChange, label, icon = 'text', class: cls }: SelecterRowProps<T>) {
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step || options.length === 0) return
    e.preventDefault()
    const index = options.findIndex((o) => o.id === value)
    const next = options[(index + step + options.length) % options.length]!
    onChange(next.id)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-option="${CSS.escape(next.id)}"]`)?.focus()
  }
  return (
    <div role="tablist" aria-label={label} class={cls} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <SegmentTab key={o.id} data-option={o.id} icon={icon} selected={o.id === value} onClick={() => { if (o.id !== value) onChange(o.id) }}>
          {o.label}
        </SegmentTab>
      ))}
    </div>
  )
}

/** Back to the gallery. Not drawn in Figma: the agent screens have no way out of themselves. */
export function BackLink({ onBack, class: cls }: { onBack?: () => void; class?: string }) {
  if (!onBack) return null
  return <LinkButton class={cls} onClick={onBack}>‹ All agents</LinkButton>
}
