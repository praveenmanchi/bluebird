import { useEffect } from 'preact/hooks'
import { Icon, LinkButton, MetaBadge, Notice, PublishEmptyState, SectionTitle, SegmentedControl, Spinner, useRpc } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { approveChangelog, loadVersions, openChangelog, openLink, refresh } from '../actions'
import { FILTER_LABEL, groupEntries } from '../format'
import {
  FEATURE_FILTERS, approveError, approvePostToJira, approving, changelogPhase, current, days, entries, error, feature, flash, fresh, loading, polling, reset, result, selected, showAll, shown, versionsResult,
  type FeatureFilter,
} from '../state'
import { ChangelogDialog } from './ChangelogDialog'
import { EntryCard } from './EntryCard'
import { EntryDetails } from './EntryDetails'
import { RangeSelect } from './RangeSelect'
import { VersionsView } from './Versions'
import './history.css'

export interface HistoryTabProps {
  /** Skip the first read (stories that preload state). */
  preloaded?: boolean
  /** "Now" for grouping; tests pin it. */
  now?: () => Date
}

/** "Anita", "Anita and Ravi", "Anita, Ravi and Meera". */
export function listNames(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Entries a filtered list shows before "Show N more". */
export const PAGE_SIZE = 10

const featureLabel = (f: FeatureFilter) => f === 'all' ? 'All' : f === 'versioning' ? 'Versioning' : FILTER_LABEL[f]

/**
 * History tab — Figma "History · 600": the whole team's extractions, changelogs,
 * reports, MCP pushes and UX AI answers, read from the repository in Settings ›
 * GitHub, plus Versioning (the open file's Figma versions). Timeline grouped by
 * day, filtered by range and feature; View details opens the entry.
 */
export function HistoryTab({ preloaded = false, now = () => new Date() }: HistoryTabProps) {
  const rpc = useRpc()
  useEffect(() => {
    if (!preloaded) void refresh(rpc)
    return () => reset()
  }, [])
  // While History is open, check for teammates' entries on the Settings › Storage interval.
  const every = result.value?.refreshMs ?? 0
  useEffect(() => {
    if (!every) return undefined
    const timer = setInterval(() => { void refresh(rpc, days.value, true) }, every)
    return () => clearInterval(timer)
  }, [every])
  const open = (url: string) => openLink(rpc, url)
  const r = result.value
  const site = r?.jiraSite ?? ''

  if (current.value) {
    const entry = current.value
    return (
      <div class="bb-history">
        <EntryDetails
          entry={entry} jiraSite={site} onBack={() => { selected.value = null; approveError.value = null }} onOpenUrl={open}
          onApprove={() => { void approveChangelog(rpc, entry) }} approving={approving.value === entry.id} approveError={approveError.value}
          postToJira={approvePostToJira.value} onPostToJiraChange={(on) => { approvePostToJira.value = on }}
        />
      </div>
    )
  }

  const all = entries.value
  const count = (f: FeatureFilter) => f === 'all' ? all.length : f === 'versioning' ? versionsResult.value?.versions.length ?? '' : all.filter((e) => e.type === f).length
  const versioning = feature.value === 'versioning'
  const list = shown.value
  const filtered = feature.value !== 'all'
  const visible = filtered && !showAll.value ? list.slice(0, PAGE_SIZE) : list
  const groups = filtered ? [{ label: featureLabel(feature.value), entries: visible }] : groupEntries(visible, now())
  const connected = r?.repo.connected ?? false

  return (
    <div class="bb-history">
      <section class="bb-history__toolbar" aria-label="Team history">
        <div class="bb-history__header">
          <SectionTitle title={versioning ? 'File versions' : 'Team history'} showCount={false} showAction={false} />
          {versioning
            ? versionsResult.value && <MetaBadge tone={versionsResult.value.problem ? 'danger' : 'success'}>{versionsResult.value.problem ? 'No Figma REST key' : 'Figma REST connected'}</MetaBadge>
            : r && <MetaBadge tone={connected ? 'success' : 'danger'}>{connected ? 'GitHub connected' : 'GitHub not connected'}</MetaBadge>}
          {connected && (
            <button
              type="button"
              class="bb-history__refresh"
              aria-label="Refresh"
              title={every ? `Checks for teammates’ changes automatically · checked ${new Date(r!.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
              data-busy={String(loading.value || polling.value)}
              disabled={loading.value}
              onClick={() => { void refresh(rpc); if (feature.value === 'versioning') void loadVersions(rpc) }}
            >
              <Icon name="ui-prototype-loop" aria-hidden="true" />
            </button>
          )}
          {connected && (
            <button type="button" class="bb-history__refresh" aria-label="New changelog" title="New changelog from this branch" onClick={() => { void openChangelog(rpc) }}>
              <Icon name="ui-general-add" aria-hidden="true" />
            </button>
          )}
        </div>
        {connected && (
          <div class="bb-history__filters">
            <RangeSelect value={days.value} disabled={loading.value} onChange={(d) => { showAll.value = false; void refresh(rpc, d).then(() => { if (versionsResult.value) void loadVersions(rpc, d) }) }} />
            <SegmentedControl
              class="bb-history__features"
              aria-label="Filter by feature"
              options={FEATURE_FILTERS.map((f) => ({ value: f, label: `${featureLabel(f)} ${count(f)}`.trim() }))}
              value={feature.value}
              onChange={(f) => { feature.value = f; showAll.value = false }}
            />
          </div>
        )}
      </section>

      {flash.value && <Notice tone="info" title="Changelog">{flash.value}</Notice>}
      {fresh.value && <Notice tone="info" title={`${fresh.value.count} new ${fresh.value.count === 1 ? 'entry' : 'entries'}`}>From {listNames(fresh.value.by)} since you last refreshed.</Notice>}

      {error.value ? (
        <PublishEmptyState state="failed" title="Couldn’t read the team history" body={error.value} actions={[{ label: 'Open settings', variant: 'secondary', onClick: requestSettings }, { label: 'Try again', variant: 'primary', onClick: () => { void refresh(rpc) } }]} />
      ) : !r ? (
        <div class="bb-history__loading"><Spinner tone="accent" size="lg" label="Reading the team history" /></div>
      ) : !connected ? (
        <PublishEmptyState state="not-connected" title="Connect the history repository" body={`${r.repo.problem ?? 'Connect a repository in Settings › GitHub'}. Everyone who uses the same repository sees the same history.`} actions={[{ label: 'Open Settings', variant: 'primary', onClick: requestSettings }]} />
      ) : versioning ? (
        <VersionsView now={now()} />
      ) : !list.length ? (
        <PublishEmptyState state="first-release" title="No history yet" body={filtered && feature.value === 'changelog' ? `No changelogs in the last ${days.value} days. Press + on a branch to generate one.` : filtered ? `Nobody on the team used ${featureLabel(feature.value)} in the last ${days.value} days.` : `Extractions, reports, changelogs, MCP pushes and UX AI answers from everyone on the team show up here. Nothing in the last ${days.value} days.`} actions={[]} />
      ) : (
        groups.map((g) => (
          <section key={g.label} class="bb-history__day" aria-label={g.label}>
            <SectionTitle title={g.label} showCount count={filtered ? list.length : g.entries.length} showAction={false} />
            <ul class="bb-history__list">
              {g.entries.map((e) => (
                <li key={e.id}><EntryCard entry={e} jiraSite={site} onOpen={() => { selected.value = e.id }} onOpenUrl={open} /></li>
              ))}
            </ul>
          </section>
        ))
      )}
      {changelogPhase.value !== 'closed' && <ChangelogDialog />}
      {filtered && !versioning && !showAll.value && list.length > PAGE_SIZE && <LinkButton class="bb-history__more" onClick={() => { showAll.value = true }}>Show {list.length - PAGE_SIZE} more</LinkButton>}
    </div>
  )
}

/** Shell entry: the registry renders tabs without props. */
export function Tab() {
  return <HistoryTab />
}
