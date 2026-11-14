import { KpiTile, MetricCell, ScoreRow, SummaryHeader } from '@shared/ui'
import { countedOf, mappedOf, percentOf } from '../audit'
import { notMappedCaption } from '../format'
import type { AuditCounts, Coverage } from '../messages'

export interface SummaryProps {
  /** "Audit summary" for the whole scope, "Screen summary" for one screen. */
  title: string
  /** The scope or screen the numbers are for. */
  badge: string
  stats?: string
  coverage: Coverage
  /** Without a library only variables were checked. */
  hasLibrary: boolean
  /** The whole audit can open its detail tiles; a screen has none. */
  details?: { open: boolean; counts: AuditCounts; onToggle: (open: boolean) => void }
}

/** Figma "Audit Summary": one "mapped" score, with the Variables and Components counts beside it. */
export function Summary({ title, badge, stats, coverage: v, hasLibrary, details }: SummaryProps) {
  const c = details?.counts
  return (
    <section class="bb-audit__summary" aria-label={title}>
      <SummaryHeader title={title} status={{ tone: 'neutral', label: badge }} stats={stats} expanded={details?.open} onToggle={details?.onToggle} />
      <div class="bb-audit__scores">
        <ScoreRow class="bb-audit__score" value={percentOf(v)} scoreLabel="mapped" meterLabel={hasLibrary ? 'Mapped to the design system' : 'Variables mapped to the design system'}
          meterScore={`${mappedOf(v).toLocaleString()} / ${countedOf(v).toLocaleString()}`} caption={notMappedCaption(countedOf(v) - mappedOf(v))} />
        <MetricCell label="Variables">{`${v.bound.toLocaleString()} of ${v.paints.toLocaleString()}`}</MetricCell>
        {hasLibrary && <MetricCell label="Components">{`${v.library.toLocaleString()} of ${v.components.toLocaleString()}`}</MetricCell>}
      </div>
      {details?.open && c && (
        <div class="bb-audit__tiles">
          <KpiTile showIcon={false} tone="success" value={c.bound} label="Bound" caption="paints" />
          <KpiTile showIcon={false} tone="danger" value={c.colours} label="Colours" caption="hard-coded" />
          <KpiTile showIcon={false} tone="warning" value={c.spacing} label="Spacing" caption="off the scale" />
          {hasLibrary && (
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
