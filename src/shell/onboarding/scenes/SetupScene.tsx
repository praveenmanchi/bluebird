import { useMemo, useRef } from 'preact/hooks'
import { Button, SegmentTab } from '@shared/ui'
import { Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

/** Illustrative only: a masked placeholder, not a real key format check. */
const MASKED_KEY = 'sk-ant-api03-••••••••••••••••'

/** Figma "Scene · Setup": pick a provider, paste a key, Save and test → connected. */
export function SetupScene({ still }: SceneProps) {
  const provider = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const save = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [
    { at: 1200, target: provider, click: true },
    { at: 2100, target: field, fx: 0.3, click: true },
    { at: 3900, target: save, click: true },
  ], [])
  return (
    <Stage still={still} stops={stops} label="An AI provider key is added in Settings and connects">
      <div class="bb-ob-scene">
        <span {...reveal(300, 'up', 'bb-ob-label')}>AI provider</span>
        <div {...reveal(300, 'up', 'bb-ob-row bb-ob-row--start')}>
          {/* Figma "Tab sub menu" (Level=3); the Selected Claude item fades in over item 1. */}
          <div class="bb-segmented-control bb-ob-providers">
            <div ref={provider}>
              <Swap enter={300} at={1300} kind="fade" before={<SegmentTab icon="ai-claude">Claude</SegmentTab>} after={<SegmentTab icon="ai-claude" selected>Claude</SegmentTab>} />
            </div>
            <SegmentTab icon="ai-openai">OpenAI</SegmentTab>
            <SegmentTab icon="ai-gemini">Gemini</SegmentTab>
          </div>
        </div>
        <span {...reveal(500, 'up', 'bb-ob-label')}>API key</span>
        <div ref={field} {...reveal(500, 'up', 'bb-ob-field')}>
          <span class="bb-ob-field__key bb-ob-type" style={{ '--ob-d': '2400ms' }}>{MASKED_KEY}</span>
          <span class="bb-ob-field__ring" aria-hidden="true" style={{ '--ob-d': '2150ms' }} />
        </div>
        <span {...reveal(700, 'up', 'bb-ob-meta')}>Stored on this device only, in Figma client storage.</span>
        <div {...reveal(800, 'up', 'bb-ob-row bb-ob-row--end')}>
          <div ref={save}><Button>Save and test</Button></div>
        </div>
        <div {...reveal(4100, 'fade', 'bb-ob-row bb-ob-row--start')}>
          <span class="bb-ob-check" aria-hidden="true" style={{ '--ob-d': '4100ms' }}>
            <svg viewBox="0 0 17 13"><path pathLength={1} d="M1 7L6 12L16 1" style={{ '--ob-d': '4350ms' }} /></svg>
          </span>
          <span class="bb-ob-heading">
            <span class="bb-ob-label">Connected to Claude</span>
            <span class="bb-ob-meta">AI features are ready to use</span>
          </span>
        </div>
      </div>
    </Stage>
  )
}
