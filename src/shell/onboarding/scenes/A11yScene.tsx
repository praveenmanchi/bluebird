import { useMemo, useRef } from 'preact/hooks'
import { BrandModeChip, Button, CheckItem, Rating } from '@shared/ui'
import { Fx, Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const CHIPS = [
  { brand: 'Bridge', ratio: '4.8:1', pass: true },
  { brand: 'Ikea', ratio: '5.2:1', pass: true },
  { brand: 'Richemont', ratio: '2.9:1', pass: false },
  { brand: 'Disney', ratio: '4.6:1', pass: true },
  { brand: 'Fiskars', ratio: '7.1:1', pass: true },
] as const

/** Figma "Scene · Accessibility": Scan → sweep over the selection → findings → Fix turns the failure into a pass. */
export function A11yScene({ still }: SceneProps) {
  const scan = useRef<HTMLDivElement>(null)
  const finding = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [
    { at: 1200, target: scan, click: true },
    { at: 4400, target: finding, fx: 0.8, fy: 0.3, click: true },
  ], [])
  return (
    <Stage still={still} stops={stops} label="An accessibility scan finds a contrast issue and fixes it">
      <div class="bb-ob-scene">
        <div {...reveal(300, 'up', 'bb-ob-row')}>
          <span class="bb-ob-label">Selection · Checkout</span>
          <div ref={scan}><Button>Scan</Button></div>
        </div>
        <div {...reveal(450, 'up', 'bb-ob-card bb-ob-card--mock')}>
          <span class="bb-ob-heading-text">Checkout</span>
          <span class="bb-ob-text">Body text on the brand surface reads a little faint.</span>
          <Button>Pay now</Button>
          <span class="bb-ob-scanner" aria-hidden="true" style={{ '--ob-d': '1400ms' }} />
        </div>
        <div {...reveal(2700, 'up', 'bb-ob-row')}>
          <span class="bb-ob-label">Contrast · 3 findings</span>
          <Rating rating="AA" />
        </div>
        <div class="bb-ob-chips">
          {CHIPS.map((c, k) => (
            <Fx key={c.brand} kind="wiggle" at={c.pass ? undefined : 3500}>
              <BrandModeChip brand={c.brand} ratio={c.ratio} pass={c.pass} current={!c.pass} {...reveal(2850 + k * 60, 'pop')} />
            </Fx>
          ))}
        </div>
        <div class="bb-ob-list">
          <div ref={finding}>
            <Swap enter={3000} at={4550} kind="right"
              before={<CheckItem status="fail" title="Body text on brand surface" detail="2.9:1 · needs 4.5:1 · ×12 layers" showAction actionLabel="Fix" />}
              after={<CheckItem status="pass" title="Body text on brand surface" detail="Fixed · 5.1:1 with text/primary · ×12 layers" />}
            />
          </div>
          <CheckItem status="warning" title="Icon button below 24 × 24" detail="Target size 2.5.8 · ×4 layers" showAction actionLabel="Fix" {...reveal(3120, 'right')} />
          <CheckItem status="pass" title="Primary button label" detail="4.8:1 · passes AA in all brands" {...reveal(3240, 'right')} />
        </div>
      </div>
    </Stage>
  )
}
