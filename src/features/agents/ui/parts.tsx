// Small tab-local compositions shared by several Agents screens. Layout and
// tokens stay in each screen's CSS (the class is passed in), so every screen's
// stylesheet still reads what its own Figma frame binds.
import { LinkButton, SegmentedControl, type IconName } from '@shared/ui'

export interface SelecterRowProps<T extends string> {
  options: readonly { id: T; label: string; icon?: IconName }[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the tablist. */
  label: string
  class?: string
}

/**
 * The scope, mode and severity rows: a Figma "Tab sub menu" (SegmentedControl) whose
 * items carry the UI Icons glyph each screen sets on them.
 */
export function SelecterRow<T extends string>({ options, value, onChange, label, class: cls }: SelecterRowProps<T>) {
  return (
    <SegmentedControl<T>
      aria-label={label}
      class={cls}
      options={options.map((o) => ({ value: o.id, label: o.label, icon: o.icon }))}
      value={value}
      onChange={onChange}
    />
  )
}

/** Back to the gallery. Not drawn in Figma: the agent screens have no way out of themselves. */
export function BackLink({ onBack, class: cls }: { onBack?: () => void; class?: string }) {
  if (!onBack) return null
  return <LinkButton class={cls} onClick={onBack}>‹ All agents</LinkButton>
}
