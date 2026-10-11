import { useMemo, useRef } from 'preact/hooks'
import { Button, CheckItem, CodeSnippet, MetaBadge, ReadinessMeter, Step } from '@shared/ui'
import { Fx, Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const CODE = 'export function TicketRow({ issue }) {\n  return <li className="ticket-row">…</li>\n}'

/** Figma "Scene · MCP handoff": readiness checks, Generate code, Push → steps complete and a PR opens. */
export function McpScene({ still }: SceneProps) {
  const generate = useRef<HTMLDivElement>(null)
  const push = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [
    { at: 2100, target: generate, click: true },
    { at: 3800, target: push, click: true },
  ], [])
  return (
    <Stage still={still} stops={stops} label="Code is generated from a ready screen and pushed as a pull request">
      <div class="bb-ob-scene">
        <div class="bb-ob-row">
          <Step number="1" label="Select" state="done" {...reveal(300, 'bounce')} />
          <Step number="2" label="Check" state="done" {...reveal(420, 'bounce')} />
          <Fx kind="pulse" at={4000}>
            <Swap enter={540} at={4000} kind="bounce" before={<Step number="3" label="Generate" state="current" />} after={<Step number="3" label="Generate" state="done" />} />
          </Fx>
          <Swap enter={660} at={4000} kind="bounce" before={<Step number="4" label="Ship" state="upcoming" />} after={<Step number="4" label="Ship" state="done" />} />
        </div>
        <ReadinessMeter tone="success" {...reveal(800)} />
        <div class="bb-ob-list">
          <CheckItem status="pass" title="Components" detail="14 of 14 instances from the library" {...reveal(1000, 'right')} />
          <CheckItem status="pass" title="Variables" detail="98% bound to Brand UI" {...reveal(1120, 'right')} />
          <CheckItem status="warning" title="Code Connect" detail="2 components have no mapping" {...reveal(1240, 'right')} />
        </div>
        <div {...reveal(1400, 'up', 'bb-ob-row bb-ob-row--end')}>
          <Button variant="secondary">Copy prompt</Button>
          <div ref={generate}><Button>Generate code</Button></div>
        </div>
        <div {...reveal(2300, 'up', 'bb-ob-card')}>
          <CodeSnippet language="TicketRow.tsx" code={CODE} />
          <div {...reveal(2900, 'fade', 'bb-ob-row')}>
            <span class="bb-ob-meta">TicketRow.tsx · 3 files</span>
            <div ref={push}><Button>Push and open PR</Button></div>
          </div>
        </div>
        <MetaBadge tone="success" meta="feat/KAN-12" {...reveal(4200, 'pop', 'bb-ob-start')}>PR #62 opened</MetaBadge>
      </div>
    </Stage>
  )
}
