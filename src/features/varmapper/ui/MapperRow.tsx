import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, Checkbox, Dropdown, DropdownMenu, Icon, MenuItem, MetaBadge, type IconName, type MetaBadgeTone } from '@shared/ui'
import { candidateLabel, glyphText, rowNote, whereLabel } from '../format'
import type { Candidate, LayerRef, MapperGroup, MatchKind } from '../messages'
import type { Binding } from '../state'

const MATCH: Readonly<Record<MatchKind, { label: string; tone: MetaBadgeTone; caption: string }>> = {
  exact: { label: 'Exact', tone: 'success', caption: 'Recommended variable' },
  check: { label: 'Check', tone: 'accent', caption: 'Suggested variable' },
  near: { label: 'Near', tone: 'warning', caption: 'Nearest variable' },
  none: { label: 'No match', tone: 'neutral', caption: 'Variable' },
}
/** Past this, a same-value list folds behind Show all. */
const SHOWN_MATCHES = 5

function IconAction({ icon, label, onClick, expanded }: { icon: IconName; label: string; onClick: () => void; expanded?: boolean }) {
  return <button type="button" class="bb-varmapper-row__action" aria-label={label} aria-expanded={expanded} onClick={onClick}><Icon name={icon} /></button>
}

/** The recommended variable: Figma "Dropdown" over the group's candidates. */
function VariablePicker({ group: g, value, disabled, onPick }: { group: MapperGroup; value: Candidate | undefined; disabled: boolean; onPick: (c: Candidate) => void }) {
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const exact = g.matches > 0
  const folded = exact && !all && g.candidates.length > SHOWN_MATCHES
  const label = exact ? `Same value · ${g.matches} variable${g.matches === 1 ? '' : 's'}` : g.match === 'near' ? 'Near, the value changes' : 'The value changes'
  return (
    <div class="bb-varmapper-row__picker" ref={root}>
      <Dropdown value={value && candidateLabel(value)} placeholder="Choose a variable" open={open} disabled={disabled || !g.candidates.length}
        aria-label={`Variable for ${g.property} ${g.current}`} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-varmapper-row__menu" aria-label="Variables">
          <div class="bb-varmapper-row__group" role="presentation">{label}</div>
          {(folded ? g.candidates.slice(0, SHOWN_MATCHES) : g.candidates).map((c) => (
            <MenuItem key={c.key} label={c.name} count={c.value} selected={c.key === value?.key} onSelect={() => { onPick(c); setOpen(false) }} />
          ))}
          {folded && <MenuItem class="bb-varmapper-row__more" label={`Show all ${g.matches}`} onSelect={() => { setAll(true) }} />}
        </DropdownMenu>
      )}
    </div>
  )
}

export interface MapperRowProps {
  group: MapperGroup
  ticked: boolean
  expanded: boolean
  /** The variable the row will bind; undefined until one is chosen. */
  variable: Candidate | undefined
  /** Where the row stands: a pick settles a Check, and can change the value. */
  kind: MatchKind
  /** The Dual File source, for the No match line. */
  source: string
  /** Name the mode on the row: a selection across modes has look-alike rows. */
  showMode: boolean
  /** Set once bound. */
  bound: Binding | undefined
  onTick: (ticked: boolean) => void
  onExpand: (expanded: boolean) => void
  onPick: (candidate: Candidate) => void
  onBind: () => void
  onUndo: () => void
  onSelect: (ids: readonly string[], label: string) => void
  onGoTo: (layer: LayerRef) => void
}

/** Figma "Mapper Row": where a hard-coded value is, what it is, and the variable to use instead. */
export function MapperRow({ group: g, ticked, expanded, variable, kind, source, showMode, bound, onTick, onExpand, onPick, onBind, onUndo, onSelect, onGoTo }: MapperRowProps) {
  const name = `${g.property} ${g.current}`
  const match = bound ? { label: 'Bound', tone: 'success' as const, caption: 'Bound variable' } : MATCH[kind]
  const state = bound ? 'bound' : ticked ? 'selected' : 'default'
  const note = rowNote(g, kind, variable, source, bound)
  const noteTone = bound ? 'success' : kind === 'near' ? 'warning' : undefined
  const swatch = typeof g.value === 'string' ? { background: g.value, opacity: g.opacity } : undefined
  return (
    <article class="bb-varmapper-row" data-state={state} aria-label={name}>
      <div class="bb-varmapper-row__header">
        {bound
          ? <Icon name="status-good" class="bb-varmapper-row__bound" />
          : <Checkbox checked={ticked} disabled={kind !== 'exact'} aria-label={`Select ${name}`} onChange={onTick} />}
        <span class="bb-varmapper-row__preview" aria-hidden="true">
          {swatch ? <span class="bb-varmapper-row__swatch" style={swatch} /> : glyphText(g)}
        </span>
        <span class="bb-varmapper-row__text">
          <span class="bb-varmapper-row__title">{g.property}</span>
          <span class="bb-varmapper-row__where" title={whereLabel(g, bound, showMode)}>{whereLabel(g, bound, showMode)}</span>
        </span>
        <IconAction icon="layers-show" label={`Select layers of ${name}`} onClick={() => onSelect(g.layers.map((l) => l.id), name)} />
        <IconAction icon="show" label={`Go to ${name}`} onClick={() => onGoTo(g.layers[0]!)} />
        <IconAction icon={expanded ? 'dropdown-up' : 'dropdown-down'} label={`${expanded ? 'Hide' : 'Show'} layers of ${name}`} expanded={expanded} onClick={() => onExpand(!expanded)} />
      </div>
      <div class="bb-varmapper-row__mapping">
        <div class="bb-varmapper-row__current">
          <span class="bb-varmapper-row__caption">Hard-coded value</span>
          <span class="bb-varmapper-row__value">{g.current}</span>
        </div>
        <span class="bb-varmapper-row__to" aria-hidden="true">→</span>
        <div class="bb-varmapper-row__recommended">
          <span class="bb-varmapper-row__caption">{match.caption}</span>
          <VariablePicker group={g} value={bound?.variable ?? variable} disabled={!!bound} onPick={onPick} />
        </div>
        <MetaBadge class="bb-varmapper-row__match" tone={match.tone}>{match.label}</MetaBadge>
        {bound
          ? <Button variant="secondary" aria-label={`Undo ${name}`} onClick={onUndo}>Undo</Button>
          : <Button variant="secondary" disabled={!variable} aria-label={`${kind === 'near' ? 'Change' : 'Bind'} ${name}`} onClick={onBind}>{kind === 'near' ? 'Change value' : 'Bind'}</Button>}
      </div>
      {note && <p class="bb-varmapper-row__note" data-tone={noteTone}>{note}</p>}
      {expanded && (
        <ul class="bb-varmapper-row__layers">
          {g.layers.map((l) => (
            <li key={l.id} class="bb-varmapper-row__layer">
              <span class="bb-varmapper-row__layer-name">{l.name}</span>
              <span class="bb-varmapper-row__layer-path">{l.path}</span>
              <IconAction icon="layers-show" label={`Select ${l.name}`} onClick={() => onSelect([l.id], l.name)} />
              <IconAction icon="show" label={`Go to ${l.name}`} onClick={() => onGoTo(l)} />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
