import { useMemo, useRef } from 'preact/hooks'
import { Button, ContextChip, MetaBadge, ProgressBar, TokenRef } from '@shared/ui'
import { Fx, Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const FIXES = [
  { name: 'Card background', from: '#2B2B2B', token: 'surface/raised' },
  { name: 'Stack gap', from: '10', token: 'space/stack-md' },
  { name: 'Caption text', from: '#9A9A9A', token: 'text/tertiary' },
] as const

/** Figma "Scene · Design tokens": coverage fills, literal values matched to tokens, Apply → 100%. */
export function TokensScene({ still }: SceneProps) {
  const apply = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [{ at: 3000, target: apply, click: true }], [])
  return (
    <Stage still={still} stops={stops} label="Token coverage rises to 100% after applying suggested tokens">
      <div class="bb-ob-scene">
        <div {...reveal(300, 'up', 'bb-ob-row')}>
          <span class="bb-ob-label">Token coverage · Checkout</span>
          <Swap enter={300} at={3600} kind="pop" before={<MetaBadge tone="warning">86%</MetaBadge>} after={<MetaBadge tone="success">100%</MetaBadge>} />
        </div>
        <Swap enter={500} at={3600} kind="fade" class="bb-ob-grow"
          before={<ProgressBar tone="warning" value={70} />}
          after={<ProgressBar tone="success" value={100} />}
        />
        <div class="bb-ob-chips">
          <MetaBadge tone="success" meta="92%" {...reveal(900, 'pop')}>Colour</MetaBadge>
          <MetaBadge tone="success" meta="88%" {...reveal(980, 'pop')}>Type</MetaBadge>
          <MetaBadge tone="warning" meta="71%" {...reveal(1060, 'pop')}>Spacing</MetaBadge>
        </div>
        <div class="bb-ob-list">
          {FIXES.map((fix, k) => (
            <Fx key={fix.name} kind="dim" at={3200 + k * 120}>
              <div {...reveal(1200 + k * 120, 'up', 'bb-ob-fix')}>
                <span class="bb-ob-label">{fix.name}</span>
                <span class="bb-ob-fix__map"><span class="bb-ob-meta">{fix.from} →</span><TokenRef name={fix.token} /></span>
              </div>
            </Fx>
          ))}
        </div>
        <div {...reveal(1800, 'up', 'bb-ob-row')}>
          <span class="bb-ob-meta">3 suggestions</span>
          <div ref={apply}><Button>Apply 3 fixes</Button></div>
        </div>
        <ContextChip type="selection" {...reveal(4100, 'pop')}>3 layers rebound to Brand UI</ContextChip>
      </div>
    </Stage>
  )
}
