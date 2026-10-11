import { AgentCard, BotAvatar, Button, LinkButton, VoiceBar } from '@shared/ui'
import { AGENTS, GALLERY_COPY, RECENT_RUNS, SCOPES, SCOPE_SIZE, type AgentDef, type AgentId, type ScopeId } from '../fixtures'
import type { CardStatus } from '../state'
import { SelecterRow } from './parts'
import './AgentsGallery.css'

export interface GalleryAgent { agent: AgentDef; status: CardStatus }

export interface AgentsGalleryProps {
  /** The six Agent Card instances, in Figma order, with their live state. */
  agents?: readonly GalleryAgent[]
  /** The selected "Tab selecters" in the Scope row. */
  scope?: ScopeId
  /** The text right of the scope options ("3 frames · 148 layers selected"). */
  scopeMeta?: string
  recentRuns?: typeof RECENT_RUNS
  onScope?: (scope: ScopeId) => void
  /** A card (or its Run button) pressed: open that agent's Setup. */
  onOpen?: (id: AgentId) => void
  /** Stop on a running card. */
  onStop?: (id: AgentId) => void
  onRunAll?: () => void
  onOpenReport?: (id: AgentId) => void
  onMic?: () => void
}

export function scopeMetaFor(scope: ScopeId): string {
  const size = SCOPE_SIZE[scope]
  return scope === 'selection' ? `${size.frames} frames · ${size.layers} layers selected` : `${size.name} · ${size.frames} ${size.frames === 1 ? 'frame' : 'frames'} · ${size.layers} layers`
}

const DEFAULT_AGENTS: readonly GalleryAgent[] = AGENTS.map((agent) => ({ agent, status: { state: agent.card.state, meta: agent.card.meta } }))

/** Figma "Agents body" on "AI Agents · Gallery" (40000297:8491): heading, scope, six agents, recent runs, voice. */
export function AgentsGallery({
  agents = DEFAULT_AGENTS, scope = 'selection', scopeMeta, recentRuns = RECENT_RUNS,
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
        <span class="bb-agents-gallery__meta">{scopeMeta ?? scopeMetaFor(scope)}</span>
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
