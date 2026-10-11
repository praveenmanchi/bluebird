import { useEffect, useState } from 'preact/hooks'
import { Button, ScanSummary, SectionTitle, SegmentTab, useRpc } from '@shared/ui'
import { MSG, type ScanResult, type ScanProgress, type ScanTarget } from '../messages'
import { scope, scanning, visited, result, error, reset, level, platform, rules, target, type LevelFilter } from '../state'
import { contrastRule, rulesFor, targetRule } from '../rules'
import { PLATFORMS, PLATFORM_TARGETS, targetCriterion, type Platform } from '../target'
import { ReadyPanel } from './ReadyPanel'
import { FilterSelect } from './FilterSelect'
import { IssueCard, criterionFor } from './IssueCard'
import { buildReport, reportToMarkdown } from '../report'
import { downloadText, safeFilename } from './download'
import { NonTextCard } from './NonTextCard'
import { TargetCard } from './TargetCard'
import { summaryProps, emptySummaryProps } from './summaryProps'
import './a11y.css'

type FindingKind = 'all' | 'contrast' | 'nontext' | 'target'

/** Web checks WCAG's 24 / 44 px; iOS and Android check their own 44 pt / 48 dp tap targets. */
const PLATFORM_OPTIONS: readonly { value: Platform; label: string }[] = PLATFORMS.map((p) => ({ value: p, label: PLATFORM_TARGETS[p].label }))

const STANDARDS = [{ value: 'wcag22', label: 'WCAG 2.2' }] as const

const LEVELS = [
  { value: 'all', label: 'Level: All' },
  { value: 'AA', label: 'Level AA' },
  { value: 'AAA', label: 'Level AAA' },
] as const satisfies readonly { value: LevelFilter; label: string }[]

/**
 * Accessibility Checker screen (Figma "accessibity UI", 40000003:5133):
 * filter toolbar (three Dropdowns + primary Scan button) over a canvas that
 * lists each finding as a WcagCard. Shell chrome (Banner, tab row, Footer)
 * comes from the shell.
 */
export function Tab() {
  const rpc = useRpc()
  const [kind, setKind] = useState<FindingKind>('all')

  useEffect(() => {
    const off = rpc.on<ScanProgress>(MSG.progress, (p) => { visited.value = p.visited })
    return () => { off(); reset() }
  }, [rpc])

  // Ready to scan describes what the scan would read and sets the scope: the selection, or the
  // whole page when nothing is selected. It follows the Figma selection.
  useEffect(() => {
    let current = 0
    const read = async () => {
      const mine = ++current
      try {
        const selected = await rpc.call<ScanTarget | null>(MSG.target, { scope: 'selection' })
        const next = selected ?? await rpc.call<ScanTarget | null>(MSG.target, { scope: 'page' })
        if (mine !== current) return
        target.value = next
        scope.value = next?.scope ?? 'selection'
      } catch {
        if (mine === current) target.value = null
      }
    }
    void read()
    const off = rpc.on('shell:selection', () => { void read() })
    return () => { off(); current = -1 }
  }, [rpc])

  async function runScan() {
    scanning.value = true
    error.value = null
    visited.value = 0
    try {
      result.value = await rpc.call<ScanResult>(MSG.scan, { scope: scope.value, platform: platform.value }, 120_000)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Scan failed'
    } finally {
      scanning.value = false
    }
  }

  const r = result.value
  const on = rules.value
  const issues = r?.issues.filter((i) => on[contrastRule(i)] && (level.value === 'all' || criterionFor(i).rating === level.value)) ?? []
  // 1.4.11 is AA only; a target finding is AA (2.5.8) or AAA (2.5.5) depending on the bar it missed.
  const nonText = level.value === 'AAA' || !on['1.4.11'] ? [] : (r?.nonText ?? [])
  const targets = (r?.targets ?? []).filter((t) => on[targetRule(t)] && (level.value === 'all' || (targetCriterion(t) === '2.5.5' ? 'AAA' : 'AA') === level.value))
  const total = issues.length + nonText.length + targets.length

  /** The artifact an auditor reads: same data, two formats. */
  function exportReport(format: 'JSON' | 'Markdown') {
    if (!r) return
    const report = buildReport(r, { ...r.meta, generatedAt: new Date().toISOString() })
    // usedIconNames (scripts/gen-tokens.ts) treats ANY bare lowercase kebab
    // literal in src/ as an icon reference — comments included — so the
    // extension is derived rather than written out, or we ship a stray glyph.
    const extension = format === 'Markdown' ? 'md' : format.toLowerCase()
    const name = safeFilename([r.meta.file, r.meta.page, 'accessibility'], extension)
    if (format === 'JSON') downloadText(name, JSON.stringify(report, null, 2), 'application/json')
    else downloadText(name, reportToMarkdown(report), 'text/markdown')
  }

  return (
    <div class="bb-a11y">
      <div class="bb-a11y__toolbar" role="toolbar" aria-label="Scan options">
        <div class="bb-a11y__filters">
          <FilterSelect label="Platform" value={platform.value} options={PLATFORM_OPTIONS} onChange={(v) => { platform.value = v }} disabled={scanning.value} />
          <FilterSelect label="Standard" value="wcag22" options={STANDARDS} onChange={() => undefined} disabled={scanning.value} />
          <FilterSelect label="Level" value={level.value} options={LEVELS} onChange={(v) => { level.value = v }} />
        </div>
        <Button onClick={runScan} loading={scanning.value}>
          {scanning.value ? `Scanning… ${visited.value.toLocaleString()}` : 'Scan'}
        </Button>
      </div>

      <div class="bb-a11y__results">
        {error.value && <p class="bb-a11y__error" role="alert">{error.value}</p>}
        {/* Figma Ready to scan: what the scan will read and the rules it checks, until the first scan. */}
        {!r && !scanning.value && (
          <ReadyPanel
            target={target.value}
            rules={rules.value}
            ruleList={rulesFor(platform.value)}
            onToggleRule={(id, enabled) => { rules.value = { ...rules.value, [id]: enabled } }}
            onCheckRules={() => { void rpc.call(MSG.openRules).catch(() => undefined) }}
          />
        )}
        {(r || scanning.value) && <ScanSummary {...(r ? summaryProps(r) : emptySummaryProps(scope.value))} />}
        {r && (
          <p class="bb-a11y__summary" role="status">
            {/* Say what was collapsed or skipped rather than quietly under-reporting. */}
            {r.instancesSkipped > 0 && <span>{r.instancesSkipped} repeated instances scanned once</span>}
            {r.exempt > 0 && <span>{r.exempt} exempt (inactive or logotype)</span>}
            {r.unmeasurable.length > 0 && <span data-tone="warn">{r.unmeasurable.length} could not be measured</span>}
          </p>
        )}
        {r && (
          <div class="bb-a11y__export">
            <span class="bb-a11y__export-label">Export report</span>
            <Button variant="secondary" onClick={() => exportReport('JSON')}>JSON</Button>
            <Button variant="secondary" onClick={() => exportReport('Markdown')}>Markdown</Button>
          </div>
        )}
        {r && r.unmeasurable.length > 0 && (
          <details class="bb-a11y__unmeasurable">
            <summary>
              {r.unmeasurable.length} layer{r.unmeasurable.length === 1 ? '' : 's'} could not be measured
            </summary>
            <ul>
              {r.unmeasurable.map((u) => (
                <li key={u.nodeId}>
                  <button type="button" onClick={() => { void rpc.call(MSG.focus, { nodeId: u.nodeId }).catch(() => undefined) }}>
                    {u.name}
                  </button>
                  {' — '}{u.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
        {r && (
          <section class="bb-a11y__findings" aria-label="Findings">
            <SectionTitle title="Findings" count={String(total)} showAction={false} />
            <div class="bb-a11y__kinds" role="tablist" aria-label="Filter findings">
              {([['all', 'All', total], ['contrast', 'Contrast', issues.length], ['nontext', 'Non-text', nonText.length], ['target', 'Target size', targets.length]] as const).map(([k, label, n]) => (
                <SegmentTab key={k} selected={kind === k} onClick={() => setKind(k)}>{label} {n}</SegmentTab>
              ))}
            </div>
            {total === 0 && (
              <p class="bb-a11y__empty">
                Nothing to report in {r.scope === 'page' ? 'this page' : 'the selection'} against WCAG 2.2 · 1.4.3, 1.4.6, 1.4.11, 2.5.8.
              </p>
            )}
            {(kind === 'all' || kind === 'contrast') && issues.map((issue) => <IssueCard key={issue.nodeId} issue={issue} />)}
            {(kind === 'all' || kind === 'nontext') && nonText.map((issue) => <NonTextCard key={issue.nodeId} issue={issue} />)}
            {(kind === 'all' || kind === 'target') && targets.map((issue) => <TargetCard key={issue.nodeId} issue={issue} />)}
          </section>
        )}
      </div>
    </div>
  )
}
