import { KpiTile, LevelRow, Notice, SectionTitle, SegmentedControl } from '@shared/ui'
import type { Asset, AssetAnalytics, TeamAnalytics, UsageRow } from '../messages'
import type { AnalyticsState } from '../state'

const ASSETS: readonly { value: Asset; label: string }[] = [
  { value: 'components', label: 'Components' }, { value: 'variables', label: 'Variables' }, { value: 'styles', label: 'Styles' }, { value: 'teams', label: 'Teams' },
]

const COPY: Readonly<Record<AssetAnalytics['asset'], { uses: string; top: string; breakdown: string; unused: string }>> = {
  components: { uses: 'Instances', top: 'Most used components', breakdown: 'Files using this library', unused: 'components' },
  variables: { uses: 'Uses', top: 'Most used variables', breakdown: 'Uses by collection', unused: 'variables' },
  styles: { uses: 'Uses', top: 'Most used styles', breakdown: 'Files using these styles', unused: 'styles' },
}

const Heading = ({ title }: { title: string }) => <SectionTitle class="bb-audit__heading" title={title} showCount={false} showAction={false} />

function Usage({ title, rows, total }: { title: string; rows: readonly UsageRow[]; total: number }) {
  if (!rows.length) return null
  return (
    <>
      <Heading title={title} />
      {rows.map((r) => <LevelRow key={r.name} class="bb-audit__usage" tone="success" name={r.name} hint={r.hint} passing={r.usages} total={total} />)}
    </>
  )
}

function AssetView({ data }: { data: AssetAnalytics }) {
  const copy = COPY[data.asset]
  return (
    <>
      <div class="bb-audit__tiles">
        <KpiTile showIcon={false} tone="neutral" value={data.uses.toLocaleString()} label={copy.uses} caption="across the org" />
        <KpiTile showIcon={false} tone="neutral" value={data.files} label="Files" caption="using the library" />
        <KpiTile showIcon={false} tone="neutral" value={data.teams} label="Teams" caption="using the library" />
        <KpiTile showIcon={false} tone="warning" value={data.detached} label="Detached" caption="last 12 weeks" />
      </div>
      <Usage title={copy.top} rows={data.top} total={data.uses} />
      <Usage title={copy.breakdown} rows={data.breakdown} total={data.uses} />
      {data.notUsed.length > 0 && (
        <>
          <Heading title={`Not used in any file (${data.notUsed.length} of ${data.published})`} />
          {data.notUsed.map((name) => <p key={name} class="bb-audit__unused">{name}</p>)}
        </>
      )}
    </>
  )
}

function TeamsView({ data }: { data: TeamAnalytics }) {
  return (
    <>
      <div class="bb-audit__tiles">
        <KpiTile showIcon={false} tone="neutral" value={data.inserted.toLocaleString()} label="Inserted" caption="last 12 weeks" />
        <KpiTile showIcon={false} tone="neutral" value={data.detached.toLocaleString()} label="Detached" caption="last 12 weeks" />
        <KpiTile showIcon={false} tone="neutral" value={data.teams} label="Teams" caption="with activity" />
        <KpiTile showIcon={false} tone="warning" value={data.detachRate === null ? '–' : `${data.detachRate}%`} label="Detached" caption="of inserted" />
      </div>
      <Usage title="Components inserted by team" rows={data.byTeam} total={data.inserted} />
      <Usage title="Week by week" rows={data.weeks} total={data.inserted} />
      {data.mostDetached.length > 0 && (
        <>
          <Heading title="Most detached components" />
          {data.mostDetached.map((d) => <p key={d.name} class="bb-audit__unused">{`${d.name} · ${d.detachments.toLocaleString()} detached`}</p>)}
        </>
      )}
    </>
  )
}

function Body({ state }: { state: AnalyticsState }) {
  if (state.status === 'idle' || state.status === 'loading') return <p class="bb-audit__status" role="status">Reading Library Analytics…</p>
  if (state.status === 'error') return <Notice tone="error" title="Library Analytics didn’t answer">{state.message}</Notice>
  if (state.status === 'unavailable') return <Notice tone="info" title={state.reason === 'plan' ? 'Across files needs Figma Enterprise' : 'Library Analytics isn’t available'}>{state.message}</Notice>
  if (state.status === 'no-source') return <Notice tone="info" title="Add a library file first">{state.message}</Notice>
  return (
    <>
      {state.asset === 'teams' ? <TeamsView data={state} /> : <AssetView data={state} />}
      {state.truncated && <p class="bb-audit__status">Not everything could be read, so these totals are lower limits.</p>}
      <p class="bb-audit__status">Library Analytics · updated daily · files you can’t open are hidden</p>
    </>
  )
}

export interface AcrossFilesProps {
  asset: Asset
  state: AnalyticsState
  onAsset: (asset: Asset) => void
}

/** Library Analytics for the whole organisation: Figma "Audit · Across files". */
export function AcrossFiles({ asset, state, onAsset }: AcrossFilesProps) {
  return (
    <>
      <SegmentedControl class="bb-audit__segments" aria-label="What to read" options={ASSETS} value={asset} onChange={onAsset} />
      <Body state={state} />
    </>
  )
}
