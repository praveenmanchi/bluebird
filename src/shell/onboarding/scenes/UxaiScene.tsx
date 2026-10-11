import { useMemo, useRef } from 'preact/hooks'
import { Button, ColorSwatch, ContextChip, Message, ThinkingOrb } from '@shared/ui'
import { Fx, Stage, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const QUESTION = 'Which accent colour should I use for links?'
/** Brand UI tier 1 colours, so the swatches follow the active brand like a real answer would. */
const SWATCHES = [
  { token: 'text/accent', css: 'var(--bb-text-accent)' },
  { token: 'feedback/success', css: 'var(--bb-feedback-success)' },
  { token: 'feedback/warning', css: 'var(--bb-feedback-warning)' },
  { token: 'feedback/danger', css: 'var(--bb-feedback-danger)' },
  { token: 'a11y/accent-muted', css: 'var(--bb-a11y-accent-muted)' },
] as const

/** Figma "Scene · UX AI": the question types itself, sends, the orb thinks, the answer brings swatches. */
export function UxaiScene({ still }: SceneProps) {
  const send = useRef<HTMLDivElement>(null)
  const swatch = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [
    { at: 1900, target: send, click: true },
    { at: 4600, target: swatch, click: true },
  ], [])
  return (
    <Stage still={still} stops={stops} label="A design-system question is answered with colour swatches">
      <div class="bb-ob-scene">
        <Message role="user" text={QUESTION} {...reveal(2000)} />
        <div {...reveal(2300, 'fade', 'bb-ob-row bb-ob-row--start')}>
          <Fx kind="spin" at={2300}><ThinkingOrb state="composing" size="20" /></Fx>
          <span class="bb-ob-meta">Searched 3 sources · Brand UI, Components, Docs</span>
        </div>
        <Message role="assistant" text="Use text/accent. It passes AA on every surface in all five brands." {...reveal(3300)} />
        <div class="bb-ob-row bb-ob-row--start">
          {SWATCHES.map((s, k) => (
            <div key={s.token} ref={k === 0 ? swatch : undefined} {...reveal(3600 + k * 80, 'pop')}>
              <ColorSwatch size="large" color={s.css} label={s.token} />
            </div>
          ))}
        </div>
        <ContextChip type="selection" {...reveal(4800, 'pop', 'bb-ob-start')}>Applied text/accent to 12 layers</ContextChip>
        <div {...reveal(200, 'up', 'bb-ob-composer')}>
          <span class="bb-ob-composer__text bb-ob-type" style={{ '--ob-d': '500ms' }}>{QUESTION}</span>
          <div ref={send}><Button>Send</Button></div>
        </div>
      </div>
    </Stage>
  )
}
