import { KpiTile, MetricCell, ScoreRow, SummaryHeader } from '@shared/ui'
import { summaryCaption } from '../format'
import type { AuditResult } from '../messages'

const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

export interface SummaryProps {
  result: Extract<AuditResult, { status: 'ready' }>
  details: boolean
  onDetails: (open: boolean) => void
}

/** Figma "Audit Summary": one score, with the Variables and Components counts beside it. */
export function Summary({ result, details, onDetails }: SummaryProps) {
  const { counts: c, score, source } = result
  return (
    <section class="bb-audit__summary" aria-label="Audit summary">
      <SummaryHeader title="Audit summary" status={{ tone: 'neutral', label: result.scope }} stats={`${plural(result.visited, 'layer')} · ${result.durationMs} ms`}
        expanded={details} onToggle={onDetails} />
      <div class="bb-audit__scores">
        <ScoreRow class="bb-audit__score" value={score.value} scoreLabel="in use" meterLabel={source ? 'From the design system' : 'Variables from the design system'}
          meterScore={`${score.used.toLocaleString()} / ${score.total.toLocaleString()}`} caption={summaryCaption(result.issues)} />
        <MetricCell label="Variables">{`${c.bound.toLocaleString()} of ${c.paints.toLocaleString()}`}</MetricCell>
        {source && <MetricCell label="Components">{`${c.library.toLocaleString()} of ${c.total.toLocaleString()}`}</MetricCell>}
      </div>
      {details && (
        <div class="bb-audit__tiles">
          <KpiTile showIcon={false} tone="success" value={c.bound} label="Bound" caption="paints" />
          <KpiTile showIcon={false} tone="danger" value={c.colours} label="Colours" caption="hard-coded" />
          <KpiTile showIcon={false} tone="warning" value={c.spacing} label="Spacing" caption="off the scale" />
          {source && (
            <>
              <KpiTile showIcon={false} tone="success" value={c.library} label="Library" caption="instances" />
              <KpiTile showIcon={false} tone="warning" value={c.detached} label="Detached" caption="layers" />
              <KpiTile showIcon={false} tone="danger" value={c.notLibrary} label="Elsewhere" caption="not in library" />
              <KpiTile showIcon={false} tone="neutral" value={c.unused} label="Unused" caption={`of ${c.published} published`} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
