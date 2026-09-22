import { useEffect } from 'preact/hooks'
import { Button, useRpc } from '@shared/ui'
import { MSG, type ScanResult, type ScanProgress, type ScanScope } from '../messages'
import { scope, scanning, visited, result, error, reset, level, type LevelFilter } from '../state'
import { FilterSelect } from './FilterSelect'
import { IssueCard, criterionFor } from './IssueCard'
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
              <strong>{r.issues.length} below AAA</strong>
              {fails > 0 && <span data-tone="error">{fails} fail AA</span>}
              <span>{r.textNodes} text layers · {r.scanned.toLocaleString()} nodes · {r.durationMs} ms</span>
            </p>
          )}
          {r && r.issues.length === 0 && <p class="bb-a11y__summary">All text passes AAA in {r.scope === 'page' ? 'this page' : 'the selection'}.</p>}
          {issues.map((issue) => <IssueCard key={issue.nodeId} issue={issue} />)}
        </div>
      )}
    </div>
  )
}
