// One agent run: read the scope, apply the agent's rule pack, ask the model where
// the pack needs one, stream progress, return the findings. Runs inside Figma
// (the inventory and palette reads) with the model call injected.
import { complete, failureOf, isProviderConfig, selectProvider, type AiFailure, type AiFetch } from '@shared/ai'
import type { IntegrationValues } from '@shared/integrations'
import { brand } from '@shared/config'
import type { AgentFinding, AgentId, RunProgress, RunRequest, RunResult, RunStep, ScopeInfo } from '../messages'
import { accessibilityFindings, type BrandModeColors } from '../rules/accessibility'
import { contentFindings } from '../rules/content'
import { designSystemFindings } from '../rules/design-system'
import { localizationFindings } from '../rules/localization'
import { bySeverity, resetFindingIds, score, type PaletteEntry, type RuleContext } from '../rules/shared'
import { batches, parseReview, reviewFindings, reviewItems, SPELLING_RULES, systemPromptFor, userMessageFor, WRITING_RULES } from '../rules/text-review'
import { collectInventory, type Inventory } from './inventory'
import { loadPalette, modeColors, type Palette } from './palette'
import { describeScope, scopeName, scopeRoots } from './scope'

export interface RunDeps {
  readAi: () => Promise<IntegrationValues<'ai'>>
  fetch: AiFetch
  emit: (progress: RunProgress) => void
  /** Polled between steps; a stopped run returns what it has. */
  stopped: () => boolean
  now?: () => number
}

/** The model gets a few seconds per batch; a page of text is several batches. */
const REVIEW_MAX_TOKENS = 4000

/** The agent's own copy for the Running screen. */
const STEP_COPY: Record<AgentId, { rules: string; read: (inv: Inventory) => string; work: string }> = {
  accessibility: { rules: 'WCAG 2.2 AA', read: (i) => `Read ${i.texts.length} text layers and ${i.nodes.length} shapes`, work: 'Checking contrast, targets, spacing and alternatives' },
  content: { rules: 'Content guide', read: (i) => `Read ${i.texts.length} text layers`, work: 'Finding placeholder copy and images' },
  writing: { rules: 'Voice & tone', read: (i) => `Read ${i.texts.length} text layers`, work: 'Reviewing microcopy with the model' },
  spelling: { rules: 'en-GB · product dictionary', read: (i) => `Read ${i.texts.length} text layers`, work: 'Checking spelling and grammar with the model' },
  'design-system': { rules: 'Brand UI', read: (i) => `Read ${i.nodes.length} layers and ${i.texts.length} texts`, work: 'Checking token bindings against Brand UI' },
  localization: { rules: 'de · fr · ar', read: (i) => `Read ${i.texts.length} text layers`, work: 'Estimating expansion and RTL impact' },
}

function brandColors(palette: Palette | null, wanted: readonly string[]): BrandModeColors | null {
  if (!palette) return null
  const modes = wanted.length ? wanted.filter((m) => palette.modes.includes(m)) : [palette.activeMode]
  if (!modes.length) return null
  const paletteIn = (mode: string): PaletteEntry[] => palette.colors.flatMap((c) => { const rgb = c.byMode[mode]; return rgb ? [{ id: c.id, name: c.name, rgb, scopes: c.scopes }] : [] })
  return { modes, activeMode: palette.activeMode, colorIn: (id, mode) => modeColors(palette, id, [mode])[mode] ?? null, paletteIn }
}

export async function runAgent(request: RunRequest, deps: RunDeps): Promise<RunResult> {
  const now = deps.now ?? Date.now
  const started = now()
  const steps: RunStep[] = []
  const sent = new Set<string>()
  let findings: AgentFinding[] = []
  let percent = 0
  let label = 'Reading the scope…'
  const emitNow = () => {
    const fresh = findings.filter((f) => !sent.has(f.id))
    fresh.forEach((f) => sent.add(f.id))
    deps.emit({ runId: request.runId, agent: request.agent, percent, steps: [...steps], findings: fresh, label })
  }
  const step = (text: string, at: number) => {
    const last = steps[steps.length - 1]
    if (last && last.status === 'running') last.status = 'done'
    steps.push({ label: text, status: 'running' })
    percent = at
    emitNow()
  }
  const done = () => { const last = steps[steps.length - 1]; if (last) last.status = 'done' }
  const ctx: RuleContext = { rules: new Set(request.rules), mode: request.mode }
  resetFindingIds()

  const roots = scopeRoots(request.scope)
  const scopeInfo: ScopeInfo = roots.length ? await describeScope(request.scope) : { scope: request.scope, name: scopeName(request.scope, roots), frames: 0, layers: 0, textLayers: 0, instances: 0, truncated: false, empty: true }
  const copy = STEP_COPY[request.agent]
  const on = ctx.rules.size === 0 ? 'all' : `${ctx.rules.size}`
  step(`Loaded rule pack · ${copy.rules} (${on} rules on)`, 5)

  let failure: AiFailure | undefined
  const finish = (checked: number, model: RunResult['model'], stopped = false): RunResult => {
    done()
    percent = 100
    label = `Checked ${scopeInfo.frames} frames · ${scopeInfo.layers} layers`
    emitNow()
    const sorted = [...findings].sort(bySeverity)
    return { runId: request.runId, agent: request.agent, scope: scopeInfo, brandModes: request.agent === 'accessibility' ? request.brandModes : [], steps, findings: sorted, score: score(sorted, checked), checked, durationMs: now() - started, model, stopped, ...(failure ? { failure } : {}) }
  }
  if (scopeInfo.empty) return finish(0, null)

  const inv = await collectInventory(roots, scopeInfo.name, (visited) => {
    label = `Reading ${Math.min(visited, scopeInfo.layers)} of ${scopeInfo.layers} layers`
    percent = Math.min(35, 5 + Math.round((30 * visited) / Math.max(scopeInfo.layers, 1)))
    emitNow()
    return !deps.stopped()
  })
  if (deps.stopped()) return finish(0, null, true)
  done()
  step(copy.read(inv), 40)

  switch (request.agent) {
    case 'accessibility': {
      const palette = await loadPalette(brand.source.collection, brand.source.mode)
      const colors = brandColors(palette, request.brandModes)
      step(palette ? `Resolved ${palette.collection} tokens in ${colors?.modes.length ?? 1} brand ${colors?.modes.length === 1 ? 'mode' : 'modes'}` : 'No Brand UI collection in this file: judging raw colours only', 55)
      label = `Checking ${scopeInfo.frames} frames · ${scopeInfo.layers} layers · ${colors?.modes.length ?? 1} brand ${colors?.modes.length === 1 ? 'mode' : 'modes'}`
      step(copy.work, 70)
      const report = accessibilityFindings(inv, ctx, colors)
      findings = report.findings
      return finish(report.checked, null)
    }
    case 'design-system': {
      const palette = await loadPalette(brand.source.collection, brand.source.mode)
      step(palette ? `Loaded ${palette.collection} · ${palette.colors.length} colour and ${palette.numbers.length} number tokens` : 'No Brand UI collection in this file: reporting raw values without swaps', 55)
      step(copy.work, 70)
      const active = palette?.activeMode
      const report = designSystemFindings(inv, ctx, palette ? { colors: palette.colors.flatMap((c) => { const rgb = active ? c.byMode[active] : null; return rgb ? [{ id: c.id, name: c.name, rgb, scopes: c.scopes }] : [] }), numbers: palette.numbers } : null)
      findings = report.findings
      return finish(report.checked, null)
    }
    case 'localization': {
      step(copy.work, 70)
      const report = localizationFindings(inv, ctx)
      findings = report.findings
      return finish(report.checked, null)
    }
    case 'content': {
      step(copy.work, 60)
      const first = contentFindings(inv, ctx)
      findings = first.findings
      emitNow()
      if (request.mode === 'review' || !first.hits.length) return finish(first.checked, null)
      // The model writes realistic copy for the placeholders it found.
      const config = selectProvider(await deps.readAi())
      if (!isProviderConfig(config)) return finish(first.checked, { skipped: config.reason === 'disabled' ? 'AI Agent Assistance is off in Settings' : 'No AI key in Settings' })
      step(`Asking ${config.model} for realistic copy (${first.hits.length} placeholders)`, 80)
      const items = reviewItems(first.hits.map((h) => h.text))
      const suggestions = new Map<string, string>()
      for (const batch of batches(items)) {
        if (deps.stopped()) break
        try {
          const text = await complete(config, { system: systemPromptFor('content', config.instructions, ctx.rules), messages: [{ role: 'user', content: userMessageFor(batch) }], maxTokens: REVIEW_MAX_TOKENS, json: true }, deps.fetch)
          for (const row of parseReview(text, batch, ['placeholder'])) {
            const item = batch.find((i) => i.index === row.index)
            if (item && row.suggestion) suggestions.set(item.id, row.suggestion)
          }
        } catch (error: unknown) {
          failure ??= failureOf(error)
          steps.push({ label: `Model couldn’t help: ${error instanceof Error ? error.message : 'no reply'}`, status: 'done' })
        }
      }
      resetFindingIds()
      findings = contentFindings(inv, ctx, suggestions).findings
      return finish(first.checked, { provider: config.provider, model: config.model }, deps.stopped())
    }
    case 'spelling':
    case 'writing': {
      const config = selectProvider(await deps.readAi())
      if (!isProviderConfig(config)) {
        steps.push({ label: 'This agent needs a model: add a key in Settings › AI Agent Assistance', status: 'done' })
        return finish(inv.texts.length, { skipped: config.reason === 'disabled' ? 'AI Agent Assistance is off in Settings' : 'No AI key in Settings' })
      }
      const items = reviewItems(inv.texts)
      const groups = batches(items)
      step(`${copy.work} (${config.model}, ${items.length} texts in ${groups.length} ${groups.length === 1 ? 'request' : 'requests'})`, 55)
      const allowed = request.agent === 'spelling' ? SPELLING_RULES : WRITING_RULES
      const rules = allowed.filter((r) => ctx.rules.size === 0 || ctx.rules.has(r))
      for (let i = 0; i < groups.length; i += 1) {
        if (deps.stopped()) break
        const batch = groups[i]!
        try {
          const text = await complete(config, { system: systemPromptFor(request.agent, config.instructions, ctx.rules), messages: [{ role: 'user', content: userMessageFor(batch) }], maxTokens: REVIEW_MAX_TOKENS, json: true }, deps.fetch)
          findings = [...findings, ...reviewFindings(request.agent, ctx, parseReview(text, batch, rules), batch, inv.texts)]
        } catch (error: unknown) {
          failure ??= failureOf(error)
          steps.push({ label: `Request ${i + 1} failed: ${error instanceof Error ? error.message : 'no reply'}`, status: 'done' })
        }
        percent = 55 + Math.round((40 * (i + 1)) / groups.length)
        label = `Reviewed ${Math.min((i + 1) * batch.length, items.length)} of ${items.length} texts`
        emitNow()
      }
      return finish(items.length, { provider: config.provider, model: config.model }, deps.stopped())
    }
  }
}
