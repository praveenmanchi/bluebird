import type { JSX } from 'preact'
import { SegmentTab } from '@shared/ui'

export interface TabStripProps<T extends string> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}

/**
 * Figma "Activity tabs": a plain auto-layout row (gap
 * jira/space/tight) of "Tab selecters" instances, each with the fixed `text`
 * glyph — not the "Group Tab selecters" track, so SegmentTab is composed
 * directly. Arrow keys move the selection.
 */
export function TabStrip<T extends string>({ options, value, onChange, class: cls, ...rest }: TabStripProps<T>) {
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(options.indexOf(value) + step + options.length) % options.length]!
    onChange(next)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-option="${CSS.escape(next)}"]`)?.focus()
  }
  return (
    <div {...rest} role="tablist" aria-orientation="horizontal" class={`bb-jira-board__tabs ${cls ?? ''}`} onKeyDown={onKeyDown}>
      {options.map((option) => (
        <SegmentTab key={option} data-option={option} icon="text" selected={option === value} onClick={() => { if (option !== value) onChange(option) }}>
          {option}
        </SegmentTab>
      ))}
    </div>
  )
}
