import { useEffect } from 'preact/hooks'
import { Button, useRpc } from '@shared/ui'
import { MSG, type ScanResult, type ScanProgress, type ScanScope } from '../messages'
import { scope, scanning, visited, result, error, reset, level, type LevelFilter } from '../state'
import { FilterSelect } from './FilterSelect'
import { IssueCard, criterionFor } from './IssueCard'
import { buildReport, reportToMarkdown } from '../report'
import { downloadText, safeFilename } from './download'
import { NonTextCard } from './NonTextCard'
import { TargetCard } from './TargetCard'
import './a11y.css'

const SCOPES = [
  { value: 'selection', label: 'Selection' },
  { value: 'page', label: 'Whole page' },
] as const satisfies readonly { value: ScanScope; label: string }[]

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

  useEffect(() => {
    const off = rpc.on<ScanProgress>(MSG.progress, (p) => { visited.value = p.visited })
    return () => { off(); reset() }
  }, [rpc])

  async function runScan() {
    scanning.value = true
    error.value = null
    visited.value = 0
    try {
      result.value = await rpc.call<ScanResult>(MSG.scan, { scope: scope.value }, 120_000)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Scan failed'
    } finally {
      scanning.value = false
    }
  }

  const r = result.value
  const issues = r?.issues.filter((i) => level.value === 'all' || criterionFor(i).rating === level.value) ?? []
  const fails = r?.issues.filter((i) => i.level === 'fail').length ?? 0
  // 1.4.11 is AA only; a target finding is AA (2.5.8) or AAA (2.5.5) depending on the bar it missed.
  const nonText = level.value === 'AAA' ? [] : (r?.nonText ?? [])
  const targets = (r?.targets ?? []).filter((t) => level.value === 'all' || (t.required > 24 ? 'AAA' : 'AA') === level.value)
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
          <FilterSelect label="Scope" value={scope.value} options={SCOPES} onChange={(v) => { scope.value = v }} disabled={scanning.value} />
          <FilterSelect label="Standard" value="wcag22" options={STANDARDS} onChange={() => undefined} disabled={scanning.value} />
          <FilterSelect label="Level" value={level.value} options={LEVELS} onChange={(v) => { level.value = v }} />
        </div>
        <Button onClick={runScan} loading={scanning.value}>
          {scanning.value ? `Scanning… ${visited.value.toLocaleString()}` : 'Scan'}
        </Button>
      </div>

      {(error.value || r) && (
        <div class="bb-a11y__results">
          {error.value && <p class="bb-a11y__error" role="alert">{error.value}</p>}
          {r && (
            <p class="bb-a11y__summary" role="status">
              <strong>{total} finding{total === 1 ? '' : 's'}</strong>
              {fails > 0 && <span data-tone="error">{fails} fail AA</span>}
              <span>
                {issues.length} contrast · {nonText.length} non-text · {targets.length} target size
              </span>
              <span>{r.textNodes} text layers · {r.scanned.toLocaleString()} nodes · {r.durationMs} ms</span>
              {/* Say what was collapsed or skipped rather than quietly under-reporting. */}
              {r.instancesSkipped > 0 && <span>{r.instancesSkipped} repeated instances scanned once</span>}
              {r.exempt > 0 && <span>{r.exempt} exempt (inactive or logotype)</span>}
              {r.unmeasurable.length > 0 && (
                <span data-tone="warn">{r.unmeasurable.length} could not be measured</span>
              )}
            </p>
          )}
          {r && (
            <div class="bb-a11y__export">
              <span class="bb-a11y__export-label">Export report</span>
              <Button variant="secondary" onClick={() => exportReport('JSON')}>JSON</Button>
              <Button variant="secondary" onClick={() => exportReport('Markdown')}>Markdown</Button>
            </div>
          )}
          {r && total === 0 && (
            <p class="bb-a11y__summary">
              Nothing to report in {r.scope === 'page' ? 'this page' : 'the selection'} against WCAG 2.2 · 1.4.3, 1.4.6, 1.4.11, 2.5.8.
            </p>
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
          {issues.map((issue) => <IssueCard key={issue.nodeId} issue={issue} />)}
          {nonText.map((issue) => <NonTextCard key={issue.nodeId} issue={issue} />)}
          {targets.map((issue) => <TargetCard key={issue.nodeId} issue={issue} />)}
        </div>
      )}
    </div>
  )
}
