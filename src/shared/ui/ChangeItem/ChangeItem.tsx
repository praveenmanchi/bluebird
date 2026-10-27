import type { JSX } from 'preact'
import { useId, useState } from 'preact/hooks'
import { BrandDiffRow, type BrandDiffRowState } from '../BrandDiffRow/BrandDiffRow'
import { ChangeRow, type ChangeRowProps } from '../ChangeRow/ChangeRow'
import { ContextChip } from '../ContextChip/ContextChip'
import { DisclosureToggle } from '../DisclosureToggle/DisclosureToggle'
import type { ValueDiffKind } from '../ValueDiff/ValueDiff'
import './ChangeItem.css'

/** One brand's value for the changed entry (a Brand Diff Row). */
export interface ChangeItemBrandValue {
  brand: string
  state: BrandDiffRowState
  kind?: ValueDiffKind
  old?: string
  new?: string
  /** The unchanged brand's value. */
  value?: string
}

export type ChangeItemRow = Omit<ChangeRowProps, 'trailing' | 'state'>

export interface ChangeItemProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onToggle'> {
  /** Figma "Expanded": No / Yes. Leave undefined to let the item keep its own state (starts collapsed). */
  expanded?: boolean
  /** Fires when the disclosure is pressed. */
  onToggle?: () => void
  /** Props for the exposed Change Row in the header. */
  row?: ChangeItemRow
  /** "Value by brand" — one Brand Diff Row each. */
  brandValues?: readonly ChangeItemBrandValue[]
  /** "Used in" — one Context Chip (Type=Source) each. */
  usedIn?: readonly string[]
  /** The source meta line under the chips. */
  source?: string
  /** id for the details region (aria-controls); generated when omitted. */
  detailsId?: string
}

const SAMPLE_BRAND_VALUES: readonly ChangeItemBrandValue[] = [
  { brand: 'Bridge', state: 'changed' },
  { brand: 'Ikea', state: 'changed' },
  { brand: 'Richemont', state: 'changed' },
  { brand: 'Disney', state: 'unchanged' },
  { brand: 'Fiskars', state: 'unchanged' },
]
const SAMPLE_USED_IN: readonly string[] = ['Button', 'Date picker', 'Tab', 'Toggle']
const SAMPLE_SOURCE = 'Brand UI › button/bg/primary · scopes Frame fill, Shape fill · changed by Praveen, 2 h ago'

/** Figma "Change Item" (40000483:9599): a Change Row that discloses its per-brand values, usage and source. */
export function ChangeItem({
  expanded,
  onToggle,
  row,
  brandValues = SAMPLE_BRAND_VALUES,
  usedIn = SAMPLE_USED_IN,
  source = SAMPLE_SOURCE,
  detailsId,
  class: cls,
  ...rest
}: ChangeItemProps) {
  const [own, setOwn] = useState(false)
  const open = expanded ?? own
  const autoId = useId()
  const regionId = detailsId ?? `bb-change-item-${autoId}`
  const toggle = () => {
    setOwn(!open)
    onToggle?.()
  }
  return (
    <div {...rest} class={`bb-change-item ${cls ?? ''}`} data-expanded={String(open)}>
      <div class="bb-change-item__header">
        <ChangeRow {...row} class={`bb-change-item__row ${row?.class ?? ''}`} />
        <DisclosureToggle
          class="bb-change-item__disclosure"
          expanded={open}
          onToggle={toggle}
          showLabel={null}
          hideLabel={null}
          aria-controls={regionId}
          aria-label={open ? 'Hide details' : 'Show details'}
        />
      </div>
      <div id={regionId} class="bb-change-item__details" hidden={!open}>
        {brandValues.length > 0 && <>
          <span id={`${regionId}-brands`} class="bb-change-item__label">Value by brand</span>
          <ul class="bb-change-item__brands" aria-labelledby={`${regionId}-brands`}>
            {brandValues.map(({ brand, ...diff }) => (
              <li key={brand}><BrandDiffRow brand={brand} {...diff} /></li>
            ))}
          </ul>
        </>}
        {usedIn.length > 0 && <>
          <span id={`${regionId}-used-in`} class="bb-change-item__label">Used in</span>
          <ul class="bb-change-item__used-in" aria-labelledby={`${regionId}-used-in`}>
            {usedIn.map((name) => <li key={name}><ContextChip type="source" icon="ui-toolbar-component">{name}</ContextChip></li>)}
          </ul>
        </>}
        <span class="bb-change-item__source">{source}</span>
      </div>
    </div>
  )
}
