import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Checkbox } from '../Checkbox/Checkbox'
import { Icon, type IconName } from '../Icon/Icon'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './ChangeRow.css'

/** What happened to a design-system entry since the last release. */
export type ChangeKind = 'added' | 'modified' | 'removed' | 'deprecated'
export type ChangeRowKind = 'color' | 'number' | 'component'
export type ChangeRowState = 'default' | 'selected'

/** Meta Badge label + tone for each change kind. */
export const CHANGE_BADGE: Readonly<Record<ChangeKind, { label: string; tone: MetaBadgeTone }>> = {
  added: { label: 'Added', tone: 'success' },
  modified: { label: 'Modified', tone: 'accent' },
  removed: { label: 'Removed', tone: 'danger' },
  deprecated: { label: 'Deprecated', tone: 'warning' },
}

/** The "Tab Icons" glyph Figma puts in the Preview box for non-colour kinds. */
const PREVIEW_ICON: Record<Exclude<ChangeRowKind, 'color'>, IconName> = { number: 'ui-variable-value', component: 'component' }

export interface ChangeRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'name'> {
  /** Figma "Kind": Color (swatch preview) / Number / Component (icon preview). */
  kind?: ChangeRowKind
  /** Figma "State": Default / Selected. */
  state?: ChangeRowState
  /** Figma "Name" — the variable or component path. */
  name?: string
  /** Figma "Detail" — one-line summary of the change. */
  detail?: string
  /** The Change Meta Badge (Figma override "Modified"). */
  change?: ChangeKind
  /** Preview swatch colour for kind color (scanned data, painted as-is). */
  swatch?: string
  /** The Include checkbox. Leave undefined to let the row keep its own state (starts checked, as in Figma). */
  included?: boolean
  onIncludedChange?: (included: boolean) => void
  /** Extra content after the badge. */
  trailing?: ComponentChildren
}

function Preview({ kind, swatch }: { kind: ChangeRowKind; swatch: string }) {
  if (kind === 'color') {
    const style = { '--change-row-swatch': swatch } as JSX.CSSProperties
    return <span class="bb-change-row__preview bb-change-row__preview--swatch" style={style} aria-hidden="true" />
  }
  return (
    <span class="bb-change-row__preview bb-change-row__preview--icon" aria-hidden="true">
      <Icon name={PREVIEW_ICON[kind]} class="bb-change-row__icon" />
    </span>
  )
}

/** Figma "Change Row" (40000345:8562): one pending design-system change — include it, see what it is, and how it changed. */
export function ChangeRow({
  kind = 'color',
  state = 'default',
  name = 'button/bg/primary',
  detail = '#0C8CE9 → #0978C8 · 2 of 8 brands',
  change = 'modified',
  swatch = '#0560A3',
  included,
  onIncludedChange,
  trailing,
  class: cls,
  ...rest
}: ChangeRowProps) {
  const [own, setOwn] = useState(true)
  const checked = included ?? own
  const badge = CHANGE_BADGE[change]
  const toggle = (next: boolean) => {
    setOwn(next)
    onIncludedChange?.(next)
  }
  return (
    <div {...rest} class={`bb-change-row ${cls ?? ''}`} data-kind={kind} data-state={state} data-included={String(checked)}>
      <Checkbox class="bb-change-row__include" checked={checked} onChange={toggle} aria-label={`Include ${name}`} />
      <Preview kind={kind} swatch={swatch} />
      <div class="bb-change-row__text">
        <span class="bb-change-row__name">{name}</span>
        <span class="bb-change-row__detail">{detail}</span>
      </div>
      <MetaBadge tone={badge.tone} class="bb-change-row__change">{badge.label}</MetaBadge>
      {trailing}
    </div>
  )
}
