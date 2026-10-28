import { useMemo, useRef } from 'preact/hooks'
import { ContextChip, PageFilter, SearchBar, VariableCard, VariableCardExpanded } from '@shared/ui'
import { Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const NAME = 'dropdown/border/default'
const META = 'Brand UI · Used by 5 components · Affects 7 modes/brands'
const ROWS = [
  { label: 'Tab sub menu', value: 5, valueLabel: 'Nodes using' },
  { label: 'Variable Row', value: 2, valueLabel: 'Nodes using' },
  { label: 'Dropdown', value: 2, valueLabel: 'Nodes using' },
] as const

/** Variable search: type a name, the card opens on the components using it, Go to opens the page. */
export function VarsearchScene({ still }: SceneProps) {
  const card = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [{ at: 2400, target: card, fx: 0.9, fy: 0.3, click: true }], [])
  return (
    <Stage still={still} stops={stops} label="Searching a variable lists the components that use it">
      <div class="bb-ob-scene">
        <div {...reveal(300, 'up', 'bb-ob-row')}>
          <PageFilter label="All Pages" tabIndex={-1} />
          <SearchBar class="bb-ob-grow" value={NAME} inputProps={{ tabIndex: -1, readOnly: true }} />
        </div>
        <div ref={card}>
          <Swap enter={900} at={2800} kind="fade"
            before={<VariableCard name={NAME} meta={META} changeCount={11} expanded={false} />}
            after={<VariableCardExpanded name={NAME} meta={META} changeCount={11} sectionTitle="Components using this variable"
              summary={[{ label: 'Components', count: 5 }, { label: 'Nodes', count: 11 }]} rows={ROWS} />}
          />
        </div>
        <ContextChip type="selection" {...reveal(3800, 'pop')}>Opened Molecules · zoomed to Tab sub menu</ContextChip>
      </div>
    </Stage>
  )
}
