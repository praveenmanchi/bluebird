import { useEffect, useState } from 'preact/hooks'
import { Button, Notice, ScanSummary, SectionTitle, SegmentedControl, useRpc, type IconName } from '@shared/ui'
import { BUILD_VERSION } from '@shared/buildInfo'
import { brand } from '@shared/config'
import { MSG, type CreatedDocument, type ScanResult, type ScanProgress, type ScanTarget } from '../messages'
import { scope, scanning, visited, result, error, reset, level, platform, standard, rules, target, ignored, type LevelFilter } from '../state'
import { contrastRule, rulesFor, targetRule, type RuleId } from '../rules'
import { contrastIgnoreKey, nonTextIgnoreKey, seedIgnored, targetIgnoreKey } from '../ignore'
import { DEFAULT_STANDARD, STANDARDS, standardLabel, type StandardId } from '../standards'
import { PLATFORMS, PLATFORM_TARGETS, targetCriterion, type Platform } from '../target'
import { ReadyPanel } from './ReadyPanel'
import { FilterSelect } from './FilterSelect'
import { IssueCard, criterionFor } from './IssueCard'
import { buildReport, reportToMarkdown } from '../report'
import { downloadText, safeFilename } from './download'
import { NonTextCard } from './NonTextCard'
import { TargetCard } from './TargetCard'
import { summaryProps, emptySummaryProps } from './summaryProps'
import { ExportMenu, type ExportFormat } from './ExportMenu'
import { createdLabel, documentId, readDocTheme } from './docTheme'
import { buildReportDoc } from '../doc/report-doc'
import './a11y.css'

/** The variable collection a finding's tokens come from, named in the warning when it cannot be read. */
const BRAND_COLLECTION = brand.source.collection

type FindingKind = 'all' | 'contrast' | 'nontext' | 'target'
/** The criteria filter items, with the UI Icons glyph each Figma "Criteria filter" item shows. */
const KINDS: readonly (readonly [FindingKind, string, IconName])[] = [
  ['all', 'All', 'ui-general-show-as-list'],
  ['contrast', 'Contrast', 'ui-color-contrast'],
  ['nontext', 'Non-text', 'ui-toolbar-shapes'],
  ['target', 'Target size', 'ui-toolbar-measure'],
]

/** Web checks WCAG's 24 / 44 px; iOS and Android check their own 44 pt / 48 dp tap targets. */
const PLATFORM_OPTIONS: readonly { value: Platform; label: string }[] = PLATFORMS.map((p) => ({ value: p, label: PLATFORM_TARGETS[p].label }))

/** WCAG 2.2, 2.1 and 2.0: each version checks only the criteria it has (2.0 has no non-text or target-size rules; 2.1 no 24 px minimum). */
const STANDARD_OPTIONS: readonly { value: StandardId; label: string }[] = STANDARDS.map((s) => ({ value: s.id, label: s.label }))

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
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState<{ format: 'figma-report' | 'developer-spec'; name: string } | { error: string } | null>(null)

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
      const scan = await rpc.call<ScanResult>(MSG.scan, { scope: scope.value, platform: platform.value, standard: standard.value }, 120_000)
      result.value = scan
      // The document remembers which findings were corrected; the tab starts from that.
      ignored.value = seedIgnored(scan)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Scan failed'
    } finally {
      scanning.value = false
    }
  }

  const r = result.value
  // Results are read with the settings they were measured with: moving a dropdown afterwards
  // must not relabel or hide findings as if the scan had been run again.
  const shownPlatform = r ? r.platform ?? 'web' : platform.value
  const shownStandard = r ? r.standard ?? DEFAULT_STANDARD : standard.value
  const stale = r !== null && (shownPlatform !== platform.value || shownStandard !== standard.value)
  // Only the rules the chosen version has are listed, and only a listed, ticked rule shows its findings.
  const ruleList = rulesFor(shownPlatform, shownStandard)
  const on = rules.value
  const listed = (id: RuleId) => on[id] && ruleList.some((rule) => rule.id === id)
  const shownIssues = r?.issues.filter((i) => listed(contrastRule(i)) && (level.value === 'all' || criterionFor(i).rating === level.value)) ?? []
  // 1.4.11 is AA only; a target finding is AA (2.5.8) or AAA (2.5.5) depending on the bar it missed.
  const shownNonText = level.value === 'AAA' || !listed('1.4.11') ? [] : (r?.nonText ?? [])
  const shownTargets = (r?.targets ?? []).filter((t) => listed(targetRule(t)) && (level.value === 'all' || (targetCriterion(t) === '2.5.5' ? 'AAA' : 'AA') === level.value))
  // A finding someone has corrected stays on screen, below the rest, and out of every count.
  const isIgnored = (key: string) => ignored.value[key] !== undefined
  const issues = shownIssues.filter((i) => !isIgnored(contrastIgnoreKey(i)))
  const nonText = shownNonText.filter((n) => !isIgnored(nonTextIgnoreKey(n)))
  const targets = shownTargets.filter((t) => !isIgnored(targetIgnoreKey(t)))
  const ignoredIssues = shownIssues.filter((i) => isIgnored(contrastIgnoreKey(i)))
  const ignoredNonText = shownNonText.filter((n) => isIgnored(nonTextIgnoreKey(n)))
  const ignoredTargets = shownTargets.filter((t) => isIgnored(targetIgnoreKey(t)))
  const ignoredTotal = ignoredIssues.length + ignoredNonText.length + ignoredTargets.length
  const total = issues.length + nonText.length + targets.length
  const counts: Record<FindingKind, number> = { all: total, contrast: issues.length, nontext: nonText.length, target: targets.length }
  /** The version the results were measured against (the dropdown may have moved since). */
  const scannedStandard = r?.standard

  /** The artifact an auditor reads: JSON and Markdown download; the Figma report and developer spec are drawn on the canvas. */
  async function exportReport(format: ExportFormat) {
    if (!r) return
    setExported(null)
    if (format === 'json' || format === 'markdown') {
      // The download holds what is on screen, as the Figma report does, and says so when filtered.
      const off = ruleList.filter((rule) => !on[rule.id]).map((rule) => rule.id)
      const filter = [level.value === 'all' ? '' : `Level ${level.value} only`, off.length ? `${off.join(', ')} unticked` : ''].filter(Boolean).join('; ')
      const report = buildReport({ ...r, issues, nonText, targets }, { ...r.meta, generatedAt: new Date().toISOString(), filter: filter || undefined })
      // usedIconNames (scripts/gen-tokens.ts) treats ANY bare lowercase kebab
      // literal in src/ as an icon reference — comments included — so the
      // extension is derived rather than written out, or we ship a stray glyph.
      const extension = format === 'markdown' ? 'md' : format.toLowerCase()
      const name = safeFilename([r.meta.file, r.meta.page, 'accessibility'], extension)
      if (format === 'json') downloadText(name, JSON.stringify(report, null, 2), 'application/json')
      else downloadText(name, reportToMarkdown(report), 'text/markdown')
      return
    }
    const now = new Date()
    const spec = format === 'developer-spec'
    const branding = {
      documentType: spec ? 'Accessibility spec for developers' : 'Accessibility report',
      createdAt: createdLabel(now),
      documentId: documentId(spec ? 'S' : 'R', now),
      file: [r.meta.file, r.meta.page].filter(Boolean).join(' › '),
      version: BUILD_VERSION,
    }
    setExporting(true)
    try {
      const theme = readDocTheme()
      const created = spec
        ? await rpc.call<CreatedDocument>(MSG.createSpec, { theme, branding, audit: { standard: r.standard, platform: shownPlatform, openIssues: total } }, 60_000)
        : await rpc.call<CreatedDocument>(MSG.createReport, {
          theme,
          branding,
          doc: buildReportDoc(r, { issues, nonText, targets }, { title: target.value?.name ?? r.meta.page, platform: shownPlatform, scannedOn: createdLabel(now).split(',')[0] ?? '' }),
        }, 60_000)
      setExported({ format, name: created.name })
    } catch (e: unknown) {
      setExported({ error: e instanceof Error ? e.message : 'Could not draw it on the canvas' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div class="bb-a11y">
      <div class="bb-a11y__toolbar" role="toolbar" aria-label="Scan options">
        <div class="bb-a11y__filters">
          <FilterSelect label="Platform" value={platform.value} options={PLATFORM_OPTIONS} onChange={(v) => { platform.value = v }} disabled={scanning.value} />
          <FilterSelect label="Standard" value={standard.value} options={STANDARD_OPTIONS} onChange={(v) => { standard.value = v }} disabled={scanning.value} />
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
            ruleList={ruleList}
            onToggleRule={(id, enabled) => { rules.value = { ...rules.value, [id]: enabled } }}
            onCheckRules={() => { void rpc.call(MSG.openRules, { standard: standard.value }).catch(() => undefined) }}
          />
        )}
        {/* The dashboard counts what the list shows: the same filters, minus anything ignored. */}
        {(r || scanning.value) && <ScanSummary {...(r ? summaryProps(r, { issues, nonText, targets }) : emptySummaryProps(scope.value))} />}
        {r && (
          <p class="bb-a11y__summary" role="status">
            {/* Say what was collapsed or skipped rather than quietly under-reporting. */}
            {r.instancesSkipped > 0 && <span>{r.instancesSkipped} repeated instances scanned once</span>}
            {r.exempt > 0 && <span>{r.exempt} exempt (inactive or logotype)</span>}
            {r.unmeasurable.length > 0 && <span data-tone="warn">{r.unmeasurable.length} could not be measured</span>}
            {ignoredTotal > 0 && <span>{ignoredTotal} ignored</span>}
            {stale && <span data-tone="warn">These results are for {standardLabel(shownStandard)} on {PLATFORM_TARGETS[shownPlatform].label}. Scan again to use the new setting.</span>}
          </p>
        )}
        {r?.paletteError && (
          <Notice tone="error" title={`No ${BRAND_COLLECTION} variables in this scan`}>
            {r.paletteError} Ratios are still measured, but findings have no token names, no per-brand verdicts and no suggested fix.
          </Notice>
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
            {exported && 'error' in exported && <Notice tone="error" title="Couldn’t draw it on the canvas">{exported.error}</Notice>}
            {exported && 'format' in exported && (
              <Notice tone="info" title={exported.format === 'figma-report' ? 'Figma report added to the canvas' : 'Developer spec added to the canvas'}>
                {exported.format === 'figma-report'
                  ? `“${exported.name}” is next to your frames: ${total} issue${total === 1 ? '' : 's'}, each with the layer, the rule it breaks and the fix.`
                  : `“${exported.name}” is next to the screen, with focus order, names, states and keyboard notes.`}
              </Notice>
            )}
            <div class="bb-a11y__findings-bar">
              <SegmentedControl
                class="bb-a11y__kinds"
                aria-label="Filter findings"
                options={KINDS.map(([k, label, icon]) => ({ value: k, label: `${label} ${counts[k]}`, icon }))}
                value={kind}
                onChange={setKind}
              />
              <ExportMenu busy={exporting} onExport={(format) => { void exportReport(format) }} />
            </div>
            {total === 0 && (
              <p class="bb-a11y__empty">
                Nothing to report in {r.scope === 'page' ? 'this page' : 'the selection'} against {standardLabel(scannedStandard)} · {ruleList.map((rule) => rule.id).join(', ')}.
              </p>
            )}
            {(kind === 'all' || kind === 'contrast') && issues.map((issue) => <IssueCard key={issue.nodeId} issue={issue} standard={scannedStandard} />)}
            {(kind === 'all' || kind === 'nontext') && nonText.map((issue) => <NonTextCard key={issue.nodeId} issue={issue} standard={scannedStandard} />)}
            {(kind === 'all' || kind === 'target') && targets.map((issue) => <TargetCard key={issue.nodeId} issue={issue} />)}
          </section>
        )}
        {r && ignoredTotal > 0 && (
          <section class="bb-a11y__findings" aria-label="Ignored findings">
            <SectionTitle title="Ignored" count={String(ignoredTotal)} showAction={false} />
            <p class="bb-a11y__empty">
              Corrections are kept in the file, so a re-scan does not bring these back. Restore one from its card.
            </p>
            {(kind === 'all' || kind === 'contrast') && ignoredIssues.map((issue) => <IssueCard key={issue.nodeId} issue={issue} standard={scannedStandard} />)}
            {(kind === 'all' || kind === 'nontext') && ignoredNonText.map((issue) => <NonTextCard key={issue.nodeId} issue={issue} standard={scannedStandard} />)}
            {(kind === 'all' || kind === 'target') && ignoredTargets.map((issue) => <TargetCard key={issue.nodeId} issue={issue} />)}
          </section>
        )}
      </div>
    </div>
  )
}
