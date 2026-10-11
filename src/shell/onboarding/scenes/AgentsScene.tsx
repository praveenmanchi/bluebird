import { useMemo, useRef } from 'preact/hooks'
import { BotAvatar, MetaBadge, ProgressBar, Spinner, VoiceWave, type BotAgent } from '@shared/ui'
import { Fx, Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const AGENTS: readonly { agent: BotAgent; label: string }[] = [
  { agent: 'accessibility', label: 'Accessibility' },
  { agent: 'content', label: 'Content' },
  { agent: 'writing', label: 'UX writing' },
  { agent: 'spelling', label: 'Spelling' },
  { agent: 'design-system', label: 'Design system' },
  { agent: 'localization', label: 'Localisation' },
]

/** Figma "Scene · AI agents": the bots bounce in and float; the accessibility agent runs and reports. */
export function AgentsScene({ still }: SceneProps) {
  const bot = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [{ at: 2000, target: bot, click: true }], [])
  return (
    <Stage still={still} stops={stops} label="The accessibility agent runs on a page and reports its findings">
      <div class="bb-ob-scene">
        <div class="bb-ob-agents">
          {AGENTS.map(({ agent, label }, k) => (
            <div key={agent} {...reveal(300 + k * 100, 'bounce', 'bb-ob-agent')}>
              {k === 0
                ? <div ref={bot}><Swap enter={300} at={2050} kind="fade" before={<BotAvatar agent={agent} />} after={<BotAvatar agent={agent} state="working" />} /></div>
                : <Fx kind="float" at={1300 + (k % 3) * 150}><BotAvatar agent={agent} /></Fx>}
              <span class="bb-ob-label">{label}</span>
            </div>
          ))}
        </div>
        <div {...reveal(900, 'up', 'bb-ob-pill')}>
          <VoiceWave state="speaking" />
          <span class="bb-ob-text">“Run the accessibility agent on this page”</span>
        </div>
        <div {...reveal(2300, 'up', 'bb-ob-card')}>
          <div class="bb-ob-row">
            <span class="bb-ob-label">Accessibility agent · Checking 42 layers</span>
            <Swap enter={2300} at={4000} kind="fade" before={<Spinner tone="accent" label="Running" />} after={<MetaBadge tone="success">Done</MetaBadge>} />
          </div>
          <div class="bb-ob-grow bb-ob-grow--slow"><ProgressBar tone="success" value={100} /></div>
          <div class="bb-ob-chips">
            <MetaBadge tone="danger" meta="1" {...reveal(4100, 'pop')}>Critical</MetaBadge>
            <MetaBadge tone="warning" meta="2" {...reveal(4200, 'pop')}>Serious</MetaBadge>
            <MetaBadge tone="success" meta="41" {...reveal(4300, 'pop')}>Passed</MetaBadge>
          </div>
        </div>
      </div>
    </Stage>
  )
}
