import { useEffect } from 'preact/hooks'
import { Button, LinkButton, MetaBadge, TokenRef, useRpc } from '@shared/ui'
import { MSG, type AuditResult, type AuditProgress, type AuditScope, type UnboundPaint, type OffScaleSpacing } from '../messages'
import { scope, auditing, visited, result, error, reset } from '../state'
import './tokens.css'

const SCOPES = [
  { value: 'page', label: 'Whole page' },
  { value: 'selection', label: 'Selection' },
] as const satisfies readonly { value: AuditScope; label: string }[]

/** Coverage reads as a grade, so colour it like one. */
function coverageTone(coverage: number): 'ok' | 'warn' | 'error' {
  if (coverage >= 0.9) return 'ok'
  return coverage >= 0.7 ? 'warn' : 'error'
}

/**
 * Design-tokens tab: how much of this page is actually built from the system.
 *
 * Two checks, both derived from the same variable collections the a11y tab
 * reads — colours painted as literals, and auto-layout lengths that are not on
 * the spacing scale.
 */
export function Tab() {
  const rpc = useRpc()

  useEffect(() => {
    const off = rpc.on<AuditProgress>(MSG.progress, (p) => { visited.value = p.visited })
    return () => { off(); reset() }
  }, [rpc])

  async function runAudit() {
    auditing.value = true
    error.value = null
    visited.value = 0
    try {
      result.value = await rpc.call<AuditResult>(MSG.audit, { scope: scope.value }, 120_000)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Audit failed'
    } finally {
      auditing.value = false
    }
  }

  const focus = (nodeId: string) => { void rpc.call(MSG.focus, { nodeId }).catch(() => undefined) }
  const selectAll = (nodeIds: readonly string[]) => { void rpc.call(MSG.selectAll, { nodeIds }).catch(() => undefined) }

  const r = result.value
  const clean = r !== null && r.unbound.length === 0 && r.offScale.length === 0

  return (
    <div class="bb-tokens">
      <div class="bb-tokens__toolbar" role="toolbar" aria-label="Audit options">
        {SCOPES.map((s) => (
          <Button
            key={s.value}
            variant={scope.value === s.value ? 'primary' : 'secondary'}
            disabled={auditing.value}
            onClick={() => { scope.value = s.value }}
          >
            {s.label}
          </Button>
        ))}
        <span class="bb-tokens__spacer" />
        <Button onClick={runAudit} loading={auditing.value}>
          {auditing.value ? `Auditing… ${visited.value.toLocaleString()}` : 'Audit'}
        </Button>
      </div>

      {(error.value || r) && (
        <div class="bb-tokens__results">
          {error.value && <p class="bb-tokens__error" role="alert">{error.value}</p>}

          {r && (
            <p class="bb-tokens__coverage" role="status">
              <span class="bb-tokens__coverage-value" data-tone={coverageTone(r.coverage)}>
                {Math.round(r.coverage * 100)}%
              </span>
              <span class="bb-tokens__coverage-label">of paints read a variable</span>
              <span class="bb-tokens__coverage-meta">
                {r.boundPaints.toLocaleString()} bound · {r.scanned.toLocaleString()} layers · {r.durationMs} ms
              </span>
            </p>
          )}

          {clean && <p class="bb-tokens__empty">Everything on this {r.scope === 'page' ? 'page' : 'selection'} comes from the system.</p>}

          {r && r.unbound.length > 0 && (
            <section class="bb-tokens__section">
              <h3 class="bb-tokens__section-title">Colours not bound to a variable</h3>
              <ul class="bb-tokens__list">
                {r.unbound.map((u) => <UnboundRow key={`${u.kind}-${u.hex}`} issue={u} onFocus={focus} onSelectAll={selectAll} />)}
              </ul>
            </section>
          )}

          {r && r.offScale.length > 0 && (
            <section class="bb-tokens__section">
              <h3 class="bb-tokens__section-title">Spacing off the scale</h3>
              <ul class="bb-tokens__list">
                {r.offScale.map((o) => <OffScaleRow key={`${o.property}-${o.value}`} issue={o} onFocus={focus} onSelectAll={selectAll} />)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function UnboundRow({ issue, onFocus, onSelectAll }: {
  issue: UnboundPaint
  onFocus: (nodeId: string) => void
  onSelectAll: (nodeIds: readonly string[]) => void
}) {
  return (
    <li class="bb-tokens__row">
      <span class="bb-tokens__swatch" style={{ background: issue.hex }} aria-hidden="true" />
      <span class="bb-tokens__mono">{issue.hex.toUpperCase()}</span>
      <MetaBadge tone="neutral">{issue.kind}</MetaBadge>
      {issue.suggestion
        ? <TokenRef name={issue.suggestion.name} />
        : <span class="bb-tokens__meta">no variable holds this value</span>}
      <span class="bb-tokens__spacer" />
      <span class="bb-tokens__meta">×{issue.occurrences}</span>
      <LinkButton onClick={() => (issue.occurrences > 1 ? onSelectAll(issue.nodeIds) : onFocus(issue.nodeId))}>
        {issue.occurrences > 1 ? 'Select all' : 'Select'}
      </LinkButton>
    </li>
  )
}

function OffScaleRow({ issue, onFocus, onSelectAll }: {
  issue: OffScaleSpacing
  onFocus: (nodeId: string) => void
  onSelectAll: (nodeIds: readonly string[]) => void
}) {
  return (
    <li class="bb-tokens__row">
      <MetaBadge tone="warning">{issue.property}</MetaBadge>
      <span class="bb-tokens__mono">{issue.value}</span>
      {issue.nearest !== null && <span class="bb-tokens__meta">nearest on scale: {issue.nearest}</span>}
      <span class="bb-tokens__spacer" />
      <span class="bb-tokens__meta">×{issue.occurrences}</span>
      <LinkButton onClick={() => (issue.occurrences > 1 ? onSelectAll(issue.nodeIds) : onFocus(issue.nodeId))}>
        {issue.occurrences > 1 ? 'Select all' : 'Select'}
      </LinkButton>
    </li>
  )
}
