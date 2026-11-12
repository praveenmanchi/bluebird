// Pure: the team-History entry a pushed extraction leaves behind
// (see @shared/history). Everything the History tab's Entry details shows comes
// from here, so it carries the full changelog, not just a summary.
import type { Change } from '@shared/design/types'
import type { NewHistoryEntry } from '@shared/history/record'
import type { HistorySection } from '@shared/history/types'
import type { ImpactedComponent, PushResult } from './messages'
import { countKinds, type ExtractionFile } from './model'

export interface ExtractionHistoryInput {
  file: ExtractionFile
  changes: readonly Change[]
  impacted: readonly ImpactedComponent[]
  repo: string
  target: string
  /** "main · Anita Rao, 8 Nov 2026, 14:20", or null when the branch had no extraction. */
  comparedWith: string | null
  message: string
  ticket: string
  team: string
  result: PushResult
  /** Paths written by the commit. */
  files: readonly string[]
  /** Channels that were told, by name. */
  notified: readonly string[]
}

const MAX_ROWS = 200
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const time = (iso: string) => new Date(iso).toISOString().slice(11, 16)

function changeRows(changes: readonly Change[], kind: 'added' | 'modified' | 'removed') {
  const match = (c: Change) => kind === 'modified' ? c.kind !== 'added' && c.kind !== 'removed' : c.kind === kind
  return changes.filter(match).slice(0, MAX_ROWS).map((c) => {
    const changed = c.modeValues.filter((m) => m.state === 'changed')
    const first = changed[0] ?? c.modeValues[0]
    const scope = c.modeValues.length > 1 ? (changed.length === c.modeValues.length || kind !== 'modified' ? 'All brands' : changed.map((m) => m.mode).join(', ')) : undefined
    return {
      name: c.name,
      valueKind: c.preview === 'color' ? 'color' as const : 'number' as const,
      ...(kind !== 'added' && first ? { old: (first.old ?? first.value ?? '—').slice(0, 120) } : {}),
      ...(kind !== 'removed' && first ? { new: (first.new ?? first.value ?? '—').slice(0, 120) } : {}),
      ...(scope ? { scope: scope.slice(0, 120) } : {}),
      ...(c.usedIn.length ? { note: `Used by ${c.usedIn.join(', ')}`.slice(0, 300) } : {}),
      ...(c.breaking ? { breaking: true } : {}),
    }
  })
}

export function extractionEntry(i: ExtractionHistoryInput): NewHistoryEntry {
  const k = countKinds(i.changes)
  const breaking = i.impacted.filter((c) => c.breaking)
  const pushed = i.result.outcome !== 'rejected'
  const pr = i.result.outcome === 'pr-opened' ? /#\d+/.exec(i.result.headline)?.[0] : undefined
  const title = (i.message.split('\n')[0] ?? '').replace(/^\w+(\([^)]*\))?:\s*/, '').replace(/\s*\([A-Z][A-Z0-9]+-\d+\)$/, '').trim() || 'Extraction'
  const sections: HistorySection[] = []
  if (i.changes.length) {
    sections.push({ kind: 'changes', title: 'Changelog', groups: (['added', 'modified', 'removed'] as const).map((change) => ({ change, rows: changeRows(i.changes, change) })) })
  }
  if (i.impacted.length) {
    sections.push({ kind: 'items', title: 'Components impacted', rows: i.impacted.slice(0, MAX_ROWS).map((c) => ({ title: c.name, detail: `${c.variables.join(' · ')} · ${plural(c.variants, 'variant')}`.slice(0, 300), status: c.breaking ? 'fail' as const : 'warning' as const })) })
  }
  sections.push({ kind: 'code', title: 'Commit', language: 'Git', code: `${i.message}\n\n${i.files.map((f) => `~ ${f}`).join('\n')}`.slice(0, 20_000) })
  return {
    type: 'extraction',
    status: pushed ? 'done' : 'failed',
    title: title.slice(0, 160),
    summary: (pushed ? `Extraction pushed to ${i.target}${pr ? ` · PR ${pr}` : ''} · ${i.file.file}` : `Extraction not pushed to ${i.target} · ${i.file.file}`).slice(0, 300),
    by: { name: i.file.extractedBy.slice(0, 120), ...(i.team ? { team: i.team.slice(0, 80) } : {}) },
    file: i.file.file.slice(0, 200) || 'Figma file',
    ...(i.ticket ? { ticket: i.ticket } : {}),
    ...(i.changes.length ? { variables: [k.added && `${k.added} added`, k.modified && `${k.modified} modified`, k.removed && `${k.removed} removed`].filter(Boolean).join(' · ') + (pushed ? '' : ' · not pushed') } : {}),
    ...(i.impacted.length ? { components: plural(i.impacted.length, 'component') } : {}),
    ...(i.result.link ? { link: { url: i.result.link, label: (i.result.linkLabel ?? 'Open on GitHub').slice(0, 80) } } : {}),
    details: {
      description: i.result.message.slice(0, 2000),
      facts: [
        { label: 'Compared with', value: (i.comparedWith ?? 'Nothing — first extraction on this branch').slice(0, 300) },
        { label: pushed ? 'Pushed to' : 'Tried to push to', value: `${i.repo} · ${i.target}`.slice(0, 300) },
        ...(pr ? [{ label: 'Pull request', value: `${pr} ${i.target} → default branch` }] : []),
        { label: 'Files', value: plural(i.files.length, 'file') },
        ...(i.notified.length ? [{ label: 'Notified', value: i.notified.join(', ').slice(0, 300) }] : []),
      ],
      stats: [
        { value: String(i.changes.length), label: 'Variables changed' },
        { value: String(i.impacted.length), label: 'Components impacted' },
        { value: String(breaking.length), label: 'Breaking' },
      ],
      ...(pushed
        ? breaking.length ? { notice: { tone: 'error' as const, title: plural(breaking.length, 'breaking change'), body: `${breaking.map((c) => c.name).join(', ')} used a variable that was removed or renamed.`.slice(0, 600) } } : {}
        : { notice: { tone: 'error' as const, title: i.result.headline.slice(0, 120), body: i.result.message.slice(0, 600) } }),
      sections,
      activity: [
        { title: `Extracted from ${i.file.file}`.slice(0, 160), detail: `${plural(i.file.snapshot.variables.length, 'variable')} · ${plural(i.file.snapshot.components.length, 'component')}`, time: time(i.file.extractedAt) },
        { title: pushed ? `Committed to ${i.target}`.slice(0, 160) : `Push to ${i.target} rejected`.slice(0, 160), detail: i.repo.slice(0, 300), time: '' },
        ...(pr ? [{ title: `Pull request ${pr} opened`, detail: `${i.target} → default branch`, time: '' }] : []),
        ...(i.notified.length ? [{ title: 'Channels notified', detail: i.notified.join(', ').slice(0, 300), time: '' }] : []),
      ],
    },
  }
}
