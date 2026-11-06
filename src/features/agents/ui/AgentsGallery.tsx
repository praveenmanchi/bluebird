import { AgentCard, BotAvatar, Button, LinkButton, VoiceBar, type AgentCardState } from '@shared/ui'
import { AGENTS, GALLERY_COPY, SCOPES, type AgentDef, type AgentId, type BotAgent, type ScopeId } from '../agents'
import { SAMPLE_SCOPES } from '../fixtures'
import type { ScopeInfo } from '../messages'
import { SelecterRow } from './parts'
import './AgentsGallery.css'

export interface CardStatus { state: AgentCardState; status?: string; meta?: string }
export interface GalleryAgent { agent: AgentDef; status: CardStatus }
export interface RecentRun { id: string; agent: AgentId; bot: BotAgent; text: string }

/** The Figma screen's two recent runs (stories and the default render). */
export const RECENT_RUNS: readonly RecentRun[] = [
  { id: 'r1', agent: 'accessibility', bot: 'accessibility', text: 'Accessibility · Checkout flow (3 frames) · 14 issues, 6 fixed · 2h ago' },
  { id: 'r2', agent: 'spelling', bot: 'spelling', text: 'Spelling & grammar · Settings page · 3 typos fixed · 2h ago' },
]

export interface AgentsGalleryProps {
  /** The six Agent Card instances, in Figma order, with their live state. */
  agents?: readonly GalleryAgent[]
  /** The selected "Tab selecters" in the Scope row. */
  scope?: ScopeId
  /** What the sandbox says the scope reads; null while it is being asked. */
  scopeInfo?: ScopeInfo | null
  /** The text right of the scope options ("3 frames · 148 layers selected"); defaults from `scopeInfo`. */
  scopeMeta?: string
  recentRuns?: readonly RecentRun[]
  onScope?: (scope: ScopeId) => void
  /** A card (or its Run button) pressed: open that agent's Setup. */
  onOpen?: (id: AgentId) => void
  /** Stop on a running card. */
  onStop?: (id: AgentId) => void
  onRunAll?: () => void
  onOpenReport?: (id: AgentId) => void
  onMic?: () => void
}

/** "3 frames · 148 layers selected", "Payment · 1 frame · 52 layers", or what to do when nothing is selected. */
export function scopeMetaFor(info: ScopeInfo | null | undefined): string {
  if (info === null) return 'Reading the scope…'
  if (!info) return ''
  if (info.empty) return info.scope === 'selection' ? 'Nothing selected · select a frame in Figma' : 'Select a layer to pick its frame or section'
  const frames = `${info.frames} ${info.frames === 1 ? 'frame' : 'frames'}`
  const layers = `${info.layers}${info.truncated ? '+' : ''} layers`
  return info.scope === 'selection' ? `${frames} · ${layers} selected` : `${info.name} · ${frames} · ${layers}`
}

const DEFAULT_AGENTS: readonly GalleryAgent[] = AGENTS.map((agent, i) => ({ agent, status: i === 1 ? { state: 'running', status: 'Running 64%', meta: 'Checking 8 of 12 frames…' } : i === 4 ? { state: 'idle' } : { state: 'ready', meta: i === 0 ? undefined : 'Last run 2h ago' } }))

/** Figma "Agents body" on "AI Agents · Gallery" (40000297:8491): heading, scope, six agents, recent runs, voice. */
export function AgentsGallery({
  agents = DEFAULT_AGENTS, scope = 'selection', scopeInfo = SAMPLE_SCOPES[scope], scopeMeta, recentRuns = RECENT_RUNS,
  onScope, onOpen, onStop, onRunAll, onOpenReport, onMic,
}: AgentsGalleryProps) {
  return (
    <div class="bb-agents-gallery">
      <header class="bb-agents-gallery__header">
        <div class="bb-agents-gallery__title">
          <h2 class="bb-agents-gallery__heading">{GALLERY_COPY.title}</h2>
          <p class="bb-agents-gallery__subtitle">{GALLERY_COPY.subtitle}</p>
        </div>
        <Button class="bb-agents-gallery__run-all" onClick={onRunAll}>{GALLERY_COPY.runAll}</Button>
      </header>

      <div class="bb-agents-gallery__scope">
        <div class="bb-agents-gallery__options">
          <span class="bb-agents-gallery__label">Scope</span>
          <SelecterRow class="bb-agents-gallery__tabs" label="Scope" options={SCOPES} value={scope} onChange={(s) => onScope?.(s)} />
        </div>
        <span class="bb-agents-gallery__meta" role="status">{scopeMeta ?? scopeMetaFor(scopeInfo)}</span>
      </div>

      <div class="bb-agents-gallery__agents">
        {agents.map(({ agent, status }) => (
          <AgentCard
            key={agent.id}
            class="bb-agents-gallery__card"
            data-agent={agent.id}
            state={status.state}
            name={agent.name}
            purpose={agent.purpose}
            agent={agent.bot}
            rules={agent.rulesLabel}
            status={status.status}
            meta={status.meta}
            onRun={() => onOpen?.(agent.id)}
            onStop={() => onStop?.(agent.id)}
            onClick={(e: MouseEvent) => {
              if (status.state === 'coming-soon' || (e.target as HTMLElement).closest('button')) return
              onOpen?.(agent.id)
            }}
          />
        ))}
      </div>

      <section class="bb-agents-gallery__recent" aria-labelledby="bb-agents-recent">
        <h3 id="bb-agents-recent" class="bb-agents-gallery__label">{GALLERY_COPY.recent}</h3>
        {recentRuns.length === 0 && <span class="bb-agents-gallery__meta">No runs yet in this session.</span>}
        {recentRuns.map((r) => (
          <div key={r.id} class="bb-agents-gallery__run">
            <span class="bb-agents-gallery__run-left">
              <BotAvatar agent={r.bot} label="" class="bb-agents-gallery__run-bot" />
              <span class="bb-agents-gallery__run-text">{r.text}</span>
            </span>
            <LinkButton onClick={() => onOpenReport?.(r.agent)}>Open report</LinkButton>
          </div>
        ))}
      </section>

      <VoiceBar class="bb-agents-gallery__voice" state="idle" micLabel="Talk to the agents" onToggle={onMic} />
    </div>
  )
}
