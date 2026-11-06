import { useMemo, useRef } from 'preact/hooks'
import { ContextChip, VariableCard } from '@shared/ui'
import { Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

/** Variable mapper: a hard-coded value turns into the variable it should be. */
export function VarmapperScene({ still }: SceneProps) {
  const card = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [{ at: 2000, target: card, fx: 0.9, fy: 0.5, click: true }], [])
  return (
    <Stage still={still} stops={stops} label="A hard-coded value is bound to the recommended variable">
      <div class="bb-ob-scene">
        <div ref={card}>
          <Swap enter={300} at={2400} kind="fade"
            before={<VariableCard name="Corner radius · 1 px" meta="Hard-coded on 3 layers · close to radius/sm" changeCount={3} changeLabel="Layers" expanded={false} />}
            after={<VariableCard name="radius/sm" meta="Bound on 3 layers" changeCount={3} changeLabel="Layers" expanded={false} />}
          />
        </div>
        <ContextChip type="selection" {...reveal(3200, 'pop')}>Bound 3 layers to radius/sm</ContextChip>
      </div>
    </Stage>
  )
}
