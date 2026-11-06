import { useMemo, useRef } from 'preact/hooks'
import { Button, ContextChip, MetaBadge } from '@shared/ui'
import { Fx, Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const CHANGES = [
  { name: 'button/bg/primary', detail: '#0C8CE9 → #0978C8 · 2 of 8 brands', tone: 'accent', label: 'Modified' },
  { name: 'Date picker', detail: 'New · 6 variants', tone: 'success', label: 'Added' },
  { name: 'surface/translucent', detail: 'Removed · used by 4 components', tone: 'danger', label: 'Removed' },
] as const

/** Publish tab demo: the extract lists what changed, a major version is suggested, Publish → live. */
export function PublishScene({ still }: SceneProps) {
  const publish = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [{ at: 3000, target: publish, click: true }], [])
  return (
    <Stage still={still} stops={stops} label="Design-system changes are reviewed, versioned and published as v4.0.0">
      <div class="bb-ob-scene">
        <div {...reveal(300, 'up', 'bb-ob-row')}>
          <span class="bb-ob-label">Changes since v3.0.0</span>
          <MetaBadge tone="neutral">12</MetaBadge>
        </div>
        <div class="bb-ob-list">
          {CHANGES.map((c, k) => (
            <Fx key={c.name} kind="dim" at={3200 + k * 120}>
              <div {...reveal(700 + k * 140, 'up', 'bb-ob-fix')}>
                <span class="bb-ob-label">{c.name}</span>
                <span class="bb-ob-fix__map"><span class="bb-ob-meta">{c.detail}</span><MetaBadge tone={c.tone}>{c.label}</MetaBadge></span>
              </div>
            </Fx>
          ))}
        </div>
        <div {...reveal(1500, 'up', 'bb-ob-row')}>
          <span class="bb-ob-meta">Suggested: major, a token was removed</span>
          <Swap enter={1500} at={3600} kind="pop" before={<MetaBadge tone="accent">v4.0.0</MetaBadge>} after={<MetaBadge tone="success">v4.0.0 live</MetaBadge>} />
        </div>
        <div {...reveal(1800, 'up', 'bb-ob-row')}>
          <span class="bb-ob-meta">Release notes drafted from the diff</span>
          <div ref={publish}><Button>Publish v4.0.0</Button></div>
        </div>
        <ContextChip type="source" {...reveal(4100, 'pop')}>ds.bridge.design/releases/v4.0.0</ContextChip>
      </div>
    </Stage>
  )
}
