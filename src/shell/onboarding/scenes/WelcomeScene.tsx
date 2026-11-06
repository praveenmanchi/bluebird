import { useMemo, useRef } from 'preact/hooks'
import { Icon, ThinkingOrb } from '@shared/ui'
import { BRANDS } from '@shared/brand'
import { Fx, Stage, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

/** Figma "Scene · Welcome": orb, studio name, the persona's tabs popping in, two chips clicked. */
export function WelcomeScene({ still, tabs }: SceneProps) {
  const first = useRef<HTMLSpanElement>(null)
  const later = useRef<HTMLSpanElement>(null)
  const laterIndex = Math.min(tabs.length - 1, 3)
  const stops = useMemo<CursorStop[]>(() => [
    { at: 3000, target: first, click: true },
    ...(laterIndex > 0 ? [{ at: 4000, target: later, click: true }] : []),
  ], [laterIndex])
  return (
    <Stage still={still} stops={stops} label="Design Studio introduces its tabs">
      <div class="bb-ob-scene bb-ob-scene--center">
        <div {...reveal(300, 'bounce')}><Fx kind="pulse" at={1800}><ThinkingOrb state="breathing" size="40" /></Fx></div>
        <div {...reveal(600, 'up', 'bb-ob-heading')}>
          <span class="bb-ob-label">Design Studio</span>
          <span class="bb-ob-meta">{tabs.length} tabs · {BRANDS.length} brands · 1 plugin</span>
        </div>
        <div class="bb-ob-chips bb-ob-chips--center">
          {tabs.map((tab, k) => (
            <Fx key={tab.id} kind="pulse" at={k === 0 ? 3050 : k === laterIndex ? 4050 : undefined}>
              <span ref={k === 0 ? first : k === laterIndex ? later : undefined} {...reveal(900 + k * 100, 'pop', 'bb-ob-tile-chip')}>
                <Icon name={tab.icon} size="md" />
                {tab.label}
              </span>
            </Fx>
          ))}
        </div>
        <span {...reveal(1900, 'up', 'bb-ob-meta')}>Pick a tab to get started</span>
      </div>
    </Stage>
  )
}
