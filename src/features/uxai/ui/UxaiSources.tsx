import type { ComponentChildren } from 'preact'
import { Button, LinkButton, PromptChip, SourceCard, ThinkingOrb } from '@shared/ui'
import { WELCOME_PROMPTS, type Source } from '../fixtures'
import { Composer } from './Composer'
import './uxai.css'
import './UxaiSources.css'

export interface UxaiSourcesProps {
  sources: readonly Source[]
  /** Include / leave out a source (Source Card checkbox). */
  onToggleSource?: (id: string, selected: boolean) => void
  /** The Chat Input draft. */
  draft: string
  onDraft?: (value: string) => void
  /** Send a prompt (Chat Input, Welcome Prompt Chips). */
  onSend?: (prompt: string) => void
  /** When a conversation exists: return to it (not drawn in Figma, which shows the first run). */
  onBack?: () => void
  /** Each header action is drawn only when it has a handler (the tab has none yet, so it shows neither). */
  onUploadFile?: () => void
  onAddLibrary?: () => void
  onUseSelection?: () => void
  /** Where the sources come from (Dual File libraries or samples), above the grid. */
  status?: ComponentChildren
}

/** Figma "UX AI · Sources" body (40000290:5841): the knowledge sources, a drop zone, and the welcome prompts. */
export function UxaiSources({ sources, onToggleSource, draft, onDraft, onSend, onBack, onUploadFile, onAddLibrary, onUseSelection, status }: UxaiSourcesProps) {
  return (
    <div class="bb-uxai-screen bb-uxai-sources">
      <header class="bb-uxai-sources__header">
        <div class="bb-uxai-sources__title">
          <h2 class="bb-uxai-sources__heading">Knowledge sources</h2>
          <p class="bb-uxai-caption">UX AI answers only from the files you add here, and links every answer back to them.</p>
          {onBack && <LinkButton class="bb-uxai-sources__back" onClick={onBack}>Back to conversation</LinkButton>}
        </div>
        {(onUploadFile || onAddLibrary) && (
          <div class="bb-uxai-sources__actions">
            {onUploadFile && <Button variant="secondary" width="fixed" onClick={onUploadFile}>Upload file</Button>}
            {onAddLibrary && <Button variant="primary" width="fixed" onClick={onAddLibrary}>Add Figma library</Button>}
          </div>
        )}
      </header>

      <div class="bb-uxai-sources__scroll">
        {status && <div class="bb-uxai-sources__status">{status}</div>}
        {sources.length > 0 && <ul class="bb-uxai-sources__grid" aria-label="Sources">
          {sources.map((s) => (
            <li key={s.id} class="bb-uxai-sources__cell">
              <SourceCard
                class="bb-uxai-sources__card"
                name={s.name}
                meta={s.meta}
                icon={s.icon}
                status={s.status}
                statusTone={s.statusTone}
                selected={s.selected}
                onToggle={(next) => onToggleSource?.(s.id, next)}
              />
            </li>
          ))}
        </ul>}

        {/* The drop zone belongs to uploading: drawn only alongside an upload handler. */}
        {onUploadFile && (
          <div class="bb-uxai-sources__drop" role="note">
            <p class="bb-uxai-sources__drop-title">Drop variable, component, icon, type, guideline or data files</p>
            <p class="bb-uxai-caption">Figma libraries · tokens .json · .csv · .pdf · .md · .svg</p>
          </div>
        )}

        <section class="bb-uxai-sources__welcome" aria-label="Suggested questions">
          <ThinkingOrb state="breathing" size="40" />
          <h3 class="bb-uxai-sources__welcome-title">Ask anything about your design system</h3>
          <div class="bb-uxai-sources__suggestions">
            {WELCOME_PROMPTS.map((p) => <PromptChip key={p.label} icon={p.icon} onClick={() => onSend?.(p.label)}>{p.label}</PromptChip>)}
          </div>
        </section>
      </div>

      <Composer sources={sources} draft={draft} onDraft={onDraft} onSend={onSend} onUseSelection={onUseSelection} />
    </div>
  )
}
