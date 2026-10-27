import type { JSX } from 'preact'
import { SegmentedControl, type IconName } from '@shared/ui'

export interface TabStripProps<T extends string> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  /** UI Icons glyph per option, as set on the Figma items. */
  icons?: Partial<Record<T, IconName>>
}

/**
 * Figma "Activity tabs": a "Tab sub menu" (Level=3) — SegmentedControl with the jira
 * board's class for placement. Arrow keys move the selection.
 */
export function TabStrip<T extends string>({ options, value, onChange, icons, class: cls, 'aria-controls': controls, ...rest }: TabStripProps<T>) {
  return (
    <SegmentedControl<T>
      {...rest}
      class={`bb-jira-board__tabs ${cls ?? ''}`}
      options={options}
      icons={icons}
      controls={typeof controls === 'string' ? controls : undefined}
      value={value}
      onChange={onChange}
    />
  )
}
