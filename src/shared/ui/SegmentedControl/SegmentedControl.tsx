import type { ComponentChildren, JSX } from 'preact'
import type { IconName } from '../Icon/Icon'
import { SegmentTab } from '../SegmentTab/SegmentTab'
import './SegmentedControl.css'

/** One exposed "Item n" of the Figma Tab sub menu: its value, Label and Icon. */
export interface SegmentOption<T extends string = string> {
  value: T
  /** Defaults to `value`. */
  label?: ComponentChildren
  icon?: IconName
  /** The item's "Number value" count. Omit for off. */
  count?: ComponentChildren
}

export interface SegmentedControlProps<T extends string = string> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> {
  /** Figma "Level" = the number of items (2–6). Plain strings are their own label. */
  options: readonly (T | SegmentOption<T>)[]
  /** The selected option (the item set to State=Selected). */
  value?: T
  /** Icon per option value, for string options. An option's own `icon` wins. */
  icons?: Partial<Record<string, IconName>>
  /** Id of the panel the segments control (aria-controls on every tab). */
  controls?: string
  disabled?: boolean
  onChange?: (value: T) => void
}

const toOption = <T extends string>(o: T | SegmentOption<T>): SegmentOption<T> => (typeof o === 'string' ? { value: o } : o)

/** Figma "Tab sub menu" (40002378:50041): SegmentTab items on a track, in a tablist. Arrow keys move the selection. */
export function SegmentedControl<T extends string = string>({ options, value, icons, controls, disabled, onChange, class: cls, ...rest }: SegmentedControlProps<T>) {
  const items = options.map(toOption)
  const select = (next: T) => { if (next !== value) onChange?.(next) }
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step || items.length === 0 || disabled) return
    e.preventDefault()
    const index = items.findIndex((o) => o.value === value)
    const next = items[(index + step + items.length) % items.length]!.value
    select(next)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-option="${CSS.escape(next)}"]`)?.focus()
  }
  return (
    <div {...rest} role="tablist" aria-orientation="horizontal" data-level={items.length} data-disabled={disabled || undefined} class={`bb-segmented-control ${cls ?? ''}`} onKeyDown={onKeyDown}>
      {items.map((o) => (
        <SegmentTab
          key={o.value}
          class="bb-segmented-control__segment"
          data-option={o.value}
          aria-controls={controls}
          selected={o.value === value}
          icon={o.icon ?? icons?.[o.value]}
          count={o.count}
          disabled={disabled}
          onClick={() => select(o.value)}
        >
          {o.label ?? o.value}
        </SegmentTab>
      ))}
    </div>
  )
}
