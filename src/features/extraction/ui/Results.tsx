import { ChangeCount, ChangeItem, ChangeRow, LinkButton, MetaBadge, PublishEmptyState, SectionTitle, SegmentedControl, type ChangeCountType } from '@shared/ui'
import { copyText } from '@shared/clipboard'
import { useState } from 'preact/hooks'
import type { Change } from '@shared/design/types'
import { countKinds, diffJson } from '../model'
import { plural } from '../format'
import { changes, expanded, filter, result, showAll, type ChangeFilter } from '../state'

/** How many changes show before "Show N more". */
export const PAGE_SIZE = 5
const LIST_ID = 'bb-extraction-changes'

const matches = (change: Change, f: ChangeFilter): boolean =>
  f === 'all' || (f === 'modified' ? change.kind !== 'added' && change.kind !== 'removed' : change.kind === f)

function pickFilter(id: ChangeFilter): void {
  filter.value = id
  showAll.value = false
}

const MODE_KINDS = ['added', 'modified', 'removed'] as const satisfies readonly ChangeCountType[]

/** Figma "By brand mode": one row per mode, the mode name then a Change count chip per non-zero kind. */
function ByMode() {
  const modes = result.value!.modes
  if (!modes.length) return null
  return (
    <section class="bb-extraction__card" aria-label="Changes by brand mode">
      <SectionTitle title="Changes by brand mode" showCount count={modes.length} showAction={false} />
      <ul class="bb-extraction__modes" aria-label="Brand modes">
        {modes.map((m) => (
          <li key={m.mode} class="bb-extraction__mode">
            <span class="bb-extraction__mode-name">{m.mode}</span>
            {MODE_KINDS.filter((k) => m[k] > 0).map((k) => <ChangeCount key={k} type={k} count={m[k]} />)}
          </li>
        ))}
      </ul>
    </section>
  )
}

function VariableChanges() {
  const all = changes.value
  const [copied, setCopied] = useState(false)
  const copy = () => { void copyText(diffJson(all)).then((ok) => { setCopied(ok); if (ok) setTimeout(() => setCopied(false), 2000) }) }
  if (!all.length) {
    const r = result.value!
    return (
      <section class="bb-extraction__card" aria-label="Variable changes">
        <PublishEmptyState state="no-changes" title="Nothing changed" body={`The variables in this file match the latest extraction on ${r.branch}. There is nothing to hand off.`} actions={[]} />
      </section>
    )
  }
  const k = countKinds(all)
  const shown = all.filter((c) => matches(c, filter.value))
  const visible = showAll.value ? shown : shown.slice(0, PAGE_SIZE)
  const hidden = shown.length - visible.length
  const options: ReadonlyArray<[ChangeFilter, string]> = [['all', `All ${all.length}`], ['added', `Added ${k.added}`], ['modified', `Modified ${k.modified}`], ['removed', `Removed ${k.removed}`]]
  return (
    <section class="bb-extraction__card" aria-label="Variable changes">
      <SectionTitle title="Variable changes" showCount count={all.length} showAction actionLabel={copied ? 'Copied' : 'Copy diff as JSON'} onAction={copy} />
      <SegmentedControl
        class="bb-extraction__filters"
        aria-label="Filter changes"
        controls={LIST_ID}
        options={options.map(([value, label]) => ({ value, label }))}
        value={filter.value}
        onChange={pickFilter}
      />
      <ul id={LIST_ID} class="bb-extraction__list" aria-label="Variable changes">
        {visible.map((change) => (
          <li key={change.id}>
            <ChangeItem
              expanded={expanded.value === change.id}
              onToggle={() => { expanded.value = expanded.value === change.id ? null : change.id }}
              row={{ kind: change.preview, name: change.name, detail: change.detail, change: change.kind, swatch: change.swatch, showInclude: false }}
              brandValues={change.modeValues.map((m) => m.state === 'changed'
                ? { brand: m.mode, state: 'changed', kind: m.kind, old: m.old, new: m.new }
                : { brand: m.mode, state: 'unchanged', kind: m.kind, value: m.value })}
              usedIn={change.usedIn}
              source={change.source}
            />
          </li>
        ))}
      </ul>
      {hidden > 0 && <LinkButton class="bb-extraction__more" onClick={() => { showAll.value = true }}>Show {hidden} more</LinkButton>}
    </section>
  )
}

function ComponentImpact() {
  const impacted = result.value!.impacted
  const breaking = impacted.filter((c) => c.breaking).length
  return (
    <section class="bb-extraction__card" aria-label="Component impact">
      <SectionTitle title="Component impact" showCount count={impacted.length} showAction={false} />
      <p class="bb-extraction__hint">
        {impacted.length
          ? 'Components in this file that use a variable that changed. Developers rebuild or re-check them after the push.'
          : 'No component in this file uses a variable that changed.'}
      </p>
      {breaking > 0 && <div class="bb-extraction__badges"><MetaBadge tone="danger">{breaking} breaking</MetaBadge></div>}
      {impacted.length > 0 && (
        <ul class="bb-extraction__list" aria-label="Impacted components">
          {impacted.map((c) => (
            <li key={c.name}>
              <ChangeRow
                kind="component"
                name={c.name}
                detail={`${c.variables.join(' · ')} · ${plural(c.variants, 'variant')}`}
                change="modified"
                showInclude={false}
                trailing={c.breaking ? <MetaBadge tone="danger">Breaking</MetaBadge> : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Figma "Extraction v2 · 3 Results": by brand mode, variable changes, component impact. */
export function Results() {
  return (
    <>
      <ByMode />
      <VariableChanges />
      {changes.value.length > 0 && <ComponentImpact />}
    </>
  )
}
