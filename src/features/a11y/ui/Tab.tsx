import { useEffect } from 'preact/hooks'
import { Button, Card, SegmentedControl, Alert, EmptyState, Badge, useRpc } from '@shared/ui'
import { MSG, type ScanResult, type ScanProgress, type ScanScope } from '../messages'
import { scope, scanning, visited, result, error, reset } from '../state'
import { IssueRow } from './IssueRow'

const SCOPE_LABELS: Record<ScanScope, string> = { selection: 'Selection', page: 'Whole page' }
const SCOPES = Object.keys(SCOPE_LABELS) as ScanScope[]
const scopeFromLabel = (label: string): ScanScope => SCOPES.find((s) => SCOPE_LABELS[s] === label) ?? 'selection'

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
  const fails = r?.issues.filter((i) => i.level === 'fail').length ?? 0

  return (
    <div class="flex flex-col gap-3">
      <Card padding="sm">
        <div class="flex flex-col gap-2.5">
          <div class="text-[11px] font-semibold text-zinc-900">Text contrast (WCAG 2.2)</div>
          <SegmentedControl value={SCOPE_LABELS[scope.value]} options={SCOPES.map((s) => SCOPE_LABELS[s])} onChange={(label) => { scope.value = scopeFromLabel(label) }} />
          <Button onClick={runScan} loading={scanning.value} leadingIcon="accessibility">
            {scanning.value ? `Scanning… ${visited.value.toLocaleString()} layers` : 'Scan'}
          </Button>
        </div>
      </Card>

      {error.value && <Alert variant="error" title="Scan failed">{error.value}</Alert>}

      {r && (
        <div class="flex items-center gap-2 text-[11px] text-zinc-500">
          <span>{r.textNodes} text layers in {r.scanned.toLocaleString()} nodes</span>
          <span class="ml-auto">{r.durationMs} ms</span>
        </div>
      )}

      {r && r.issues.length === 0 && (
        <Alert variant="success" title="All text passes AAA">No contrast issues found in {r.scope === 'page' ? 'this page' : 'the selection'}.</Alert>
      )}

      {r && r.issues.length > 0 && (
        <Card padding="none">
          <div class="px-3 py-2 border-b border-zinc-200 flex items-center gap-2">
            <span class="text-[11px] font-semibold">{r.issues.length} below AAA</span>
            {fails > 0 && <Badge variant="red">{fails} fail AA</Badge>}
          </div>
          <ul class="divide-y divide-zinc-100">
            {r.issues.map((issue) => <IssueRow key={issue.nodeId} issue={issue} />)}
          </ul>
        </Card>
      )}

      {!r && !scanning.value && !error.value && (
        <EmptyState icon="◎" title="Nothing scanned yet" description="Select frames or scan the whole page to check text contrast." />
      )}
    </div>
  )
}
