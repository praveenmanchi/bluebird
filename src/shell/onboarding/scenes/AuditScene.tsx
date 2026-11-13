import { useMemo, useRef } from 'preact/hooks'
import { ContextChip, ScoreRow, VariableCard, VariableCardExpanded } from '@shared/ui'
import { Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const META = 'Fill · use surface/raised'
const ROWS = [{ label: 'Access code flow', value: 12, valueLabel: 'Layers' }, { label: 'SSO flow', value: 7, valueLabel: 'Layers' }] as const

/** Audit: one score for a page, then every issue and where it is. */
export function AuditScene({ still }: SceneProps) {
  const card = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [{ at: 2200, target: card, fx: 0.9, fy: 0.3, click: true }], [])
  return (
    <Stage still={still} stops={stops} label="An audit scores the page and shows where each issue is">
      <div class="bb-ob-scene">
        <div {...reveal(300, 'up')}>
          <ScoreRow value={89} scoreLabel="in use" meterLabel="From the design system" meterScore="673 / 760" caption="111 issues to review" />
        </div>
        <div ref={card}>
          <Swap enter={900} at={2600} kind="fade"
            before={<VariableCard kind="variable" name="#26262B" meta={META} changeCount={19} changeLabel="Layers" expanded={false} />} // allow-raw: sample content mirroring the Figma component, shown as data
            after={<VariableCardExpanded kind="variable" name="#26262B" meta={META} changeCount={19} changeLabel="Layers" sectionTitle="Where it is used" rows={ROWS} />} // allow-raw: sample content mirroring the Figma component, shown as data
          />
        </div>
        <ContextChip type="selection" {...reveal(3600, 'pop')}>Selected 12 layers in Access code flow</ContextChip>
      </div>
    </Stage>
  )
}
