import type { JSX } from 'preact'
import type { IconName } from '../Icon/Icon'
import { SegmentTab } from '../SegmentTab/SegmentTab'
import './SegmentedControl.css'

export interface SegmentedControlProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> {
  /** Figma "Property 1": "4 level" has four segments, "2 level" two — the number of options decides. */
  options: readonly string[]
  /** The selected option (the Selected "Tab selecters" instance). */
  value?: string
  /** Optional icon per option (the fixed "Tab Icons" instance on each segment). */
  icons?: Partial<Record<string, IconName>>
  disabled?: boolean
  onChange?: (value: string) => void
}

/** Figma "Group Tab selecters" (308:51205): a row of SegmentTab inside a tablist. Arrow keys move the selection. */
export function SegmentedControl({ options, value, icons, disabled, onChange, class: cls, ...rest }: SegmentedControlProps) {
  const select = (next: string) => { if (next !== value) onChange?.(next) }
  const onKeyDown = (e: KeyboardEvent) => {
    const index = options.indexOf(value ?? '')
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step || options.length === 0) return
    e.preventDefault()
    const next = options[(index + step + options.length) % options.length]!
    select(next)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-option="${CSS.escape(next)}"]`)?.focus()
  }
  return (
    <div {...rest} role="tablist" aria-orientation="horizontal" data-level={options.length} data-disabled={disabled || undefined} class={`bb-segmented-control ${cls ?? ''}`} onKeyDown={onKeyDown}>
      {options.map((option) => (
        <SegmentTab key={option} class="bb-segmented-control__segment" data-option={option} selected={option === value} icon={icons?.[option]} disabled={disabled} onClick={() => select(option)}>
          {option}
        </SegmentTab>
      ))}
    </div>
  )
}
