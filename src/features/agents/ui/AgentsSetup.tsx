import { AgentHeader, Button, Checkbox, LinkButton, RuleRow, VoiceBar } from '@shared/ui'
import { BRAND_MODES, MODES, OUTPUTS, SCOPES, SCOPE_SIZE, agentById, type AgentDef, type RunMode, type ScopeId } from '../fixtures'
import { BackLink, SelecterRow } from './parts'
import './AgentsSetup.css'

export interface AgentsSetupProps {
  /** The open agent (Accessibility on the Figma screen). */
  agent?: AgentDef
  scope?: ScopeId
  /** Rule id → enabled; missing ids use the fixture's default. */
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

export function setupScopeMeta(scope: ScopeId): string {
  const s = SCOPE_SIZE[scope]
  return `${s.name} · ${s.frames} ${s.frames === 1 ? 'frame' : 'frames'} · ${s.layers} layers`
}

/** Figma "Agents body" on "AI Agents · Setup" (40000298:5805): agent header, scope, rule pack + options, run. */
export function AgentsSetup({
  agent = agentById('accessibility'), scope = 'selection', rules = {}, mode = 'suggest', brands = {}, outputs = {},
  onScope, onToggleRule, onMode, onBrand, onOutput, onEditRules, onRun, onMic, onBack,
}: AgentsSetupProps) {
  const help = MODES.find((m) => m.id === mode)?.help
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
        <span class="bb-agents-setup__meta">{setupScopeMeta(scope)}</span>
      </div>

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
          <h3 class="bb-agents-setup__label">CHECK IN BRAND MODES</h3>
          <div class="bb-agents-setup__brands">
            {BRAND_MODES.map((b) => (
              <Checkbox key={b} class="bb-agents-setup__check" label={b} checked={brands[b] ?? true} onChange={(on) => onBrand?.(b, on)} />
            ))}
          </div>
          <h3 class="bb-agents-setup__label">OUTPUT</h3>
          {OUTPUTS.map((o) => (
            <Checkbox key={o.id} class="bb-agents-setup__check" label={o.label} checked={outputs[o.id] ?? o.checked} onChange={(on) => onOutput?.(o.id, on)} />
          ))}
        </section>
      </div>

      <div class="bb-agents-setup__run">
        <VoiceBar class="bb-agents-setup__voice" state="idle" micLabel={`Talk to the ${agent.title}`} onToggle={onMic} />
        <Button class="bb-agents-setup__go" size="lg" onClick={onRun}>{agent.runLabel}</Button>
      </div>
    </div>
  )
}
