import { AgentHeader, Button, Checkbox, LinkButton, Notice, RuleRow, VoiceBar } from '@shared/ui'
import { BRAND_MODES, MODES, OUTPUTS, SCOPES, agentById, type AgentDef, type RunMode, type ScopeId } from '../agents'
import { SAMPLE_SCOPES } from '../fixtures'
import type { ScopeInfo } from '../messages'
import { BackLink, SelecterRow } from './parts'
import { scopeMetaFor } from './AgentsGallery'
import './AgentsSetup.css'

export interface AgentsSetupProps {
  /** The open agent (Accessibility on the Figma screen). */
  agent?: AgentDef
  scope?: ScopeId
  /** What the scope reads; null while it is being asked. */
  scopeInfo?: ScopeInfo | null
  /** A model is configured in Settings (the Spelling / UX writing agents need one). */
  modelReady?: boolean
  /** Rule id → enabled; missing ids use the agent's default. */
  rules?: Readonly<Record<string, boolean>>
  mode?: RunMode
  /** Brand mode name → checked. */
  brands?: Readonly<Record<string, boolean>>
  /** Output id → checked. */
  outputs?: Readonly<Record<string, boolean>>
  onScope?: (scope: ScopeId) => void
  onToggleRule?: (ruleId: string, enabled: boolean) => void
  onMode?: (mode: RunMode) => void
  onBrand?: (brand: string, checked: boolean) => void
  onOutput?: (id: string, checked: boolean) => void
  onEditRules?: () => void
  onRun?: () => void
  onMic?: () => void
  onBack?: () => void
}

export function setupScopeMeta(info: ScopeInfo | null | undefined): string {
  if (!info || info.empty) return scopeMetaFor(info)
  return `${info.name} · ${info.frames} ${info.frames === 1 ? 'frame' : 'frames'} · ${info.layers}${info.truncated ? '+' : ''} layers · ${info.textLayers} text layers`
}

/** Figma "Agents body" on "AI Agents · Setup" (40000298:5805): agent header, scope, rule pack + options, run. */
export function AgentsSetup({
  agent = agentById('accessibility'), scope = 'selection', scopeInfo = SAMPLE_SCOPES[scope], modelReady = true, rules = {}, mode = 'suggest', brands = {}, outputs = {},
  onScope, onToggleRule, onMode, onBrand, onOutput, onEditRules, onRun, onMic, onBack,
}: AgentsSetupProps) {
  const help = MODES.find((m) => m.id === mode)?.help
  const empty = scopeInfo?.empty === true
  return (
    <div class="bb-agents-setup">
      <BackLink class="bb-agents-setup__back" onBack={onBack} />
      <AgentHeader
        class="bb-agents-setup__header"
        name={agent.title}
        purpose={agent.headerPurpose}
        agent={agent.bot}
        botState="default"
        chips={agent.headerChips}
        status="Ready"
        statusTone="success"
      />

      <div class="bb-agents-setup__scope">
        <div class="bb-agents-setup__options">
          <span class="bb-agents-setup__label">Scope</span>
          <SelecterRow class="bb-agents-setup__tabs" label="Scope" options={SCOPES} value={scope} onChange={(s) => onScope?.(s)} />
        </div>
        <span class="bb-agents-setup__meta" role="status">{setupScopeMeta(scopeInfo)}</span>
      </div>
      {agent.needsModel && !modelReady && (
        <Notice tone="info" title="This agent reads with your model">Add a Claude, OpenAI or Gemini key in Settings › AI Agent Assistance. Without one the run reads the text but can’t review it.</Notice>
      )}

      <div class="bb-agents-setup__columns">
        <section class="bb-agents-setup__panel" aria-label="Rule pack">
          <div class="bb-agents-setup__head">
            <h3 class="bb-agents-setup__label">{agent.ruleHead}</h3>
            <LinkButton onClick={onEditRules}>Edit rules</LinkButton>
          </div>
          {agent.rules.map((r) => (
            <RuleRow
              key={r.id}
              class="bb-agents-setup__rule"
              data-levels={agent.levels || undefined}
              name={r.name}
              description={r.description}
              level={r.level}
              enabled={rules[r.id] ?? r.enabled}
              onToggle={(on) => onToggleRule?.(r.id, on)}
            />
          ))}
        </section>

        <section class="bb-agents-setup__panel" aria-label="How it works">
          <h3 class="bb-agents-setup__label">WHAT SHOULD IT DO?</h3>
          <SelecterRow class="bb-agents-setup__tabs" label="What should it do?" options={MODES} value={mode} onChange={(m) => onMode?.(m)} />
          {help && <p class="bb-agents-setup__meta">{help}</p>}
          {agent.id === 'accessibility' && (
            <>
              <h3 class="bb-agents-setup__label">CHECK IN BRAND MODES</h3>
              <div class="bb-agents-setup__brands">
                {BRAND_MODES.map((b) => (
                  <Checkbox key={b} class="bb-agents-setup__check" label={b} checked={brands[b] ?? true} onChange={(on) => onBrand?.(b, on)} />
                ))}
              </div>
            </>
          )}
          <h3 class="bb-agents-setup__label">OUTPUT</h3>
          {OUTPUTS.map((o) => (
            <Checkbox key={o.id} class="bb-agents-setup__check" label={o.label} checked={outputs[o.id] ?? o.checked} onChange={(on) => onOutput?.(o.id, on)} />
          ))}
        </section>
      </div>

      <div class="bb-agents-setup__run">
        <VoiceBar class="bb-agents-setup__voice" state="idle" micLabel={`Talk to the ${agent.title}`} onToggle={onMic} />
        <Button class="bb-agents-setup__go" size="lg" disabled={empty} onClick={onRun}>{agent.runLabel}</Button>
      </div>
    </div>
  )
}
