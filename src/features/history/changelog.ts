// Pure: a changelog — what a Figma branch changed against its main file — as
// the team-History entry it becomes, the approval that publishes it, and the
// Markdown section it adds to the shared changelog file. No Figma, no network.
import type { Change } from '@shared/design/types'
import type { NewHistoryEntry } from '@shared/history/record'
import type { HistoryEntry, HistorySection } from '@shared/history/types'

export const MAX_ROWS = 200
/** The shared changelog sits beside the history folder: .bluebird/history → .bluebird/DESIGN-CHANGELOG.md. */
export const CHANGELOG_FILE = 'DESIGN-CHANGELOG.md'
const HEADING = '# Design changelog'

type Group = 'added' | 'modified' | 'removed'
const GROUPS: readonly Group[] = ['added', 'modified', 'removed']
const LABEL: Record<Group, string> = { added: 'Added', modified: 'Updated', removed: 'Deleted' }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** Deprecations are listed with the updates: the entry still exists. */
const groupOf = (c: Change): Group => c.kind === 'added' || c.kind === 'removed' ? c.kind : 'modified'
const of = (changes: readonly Change[], subject: Change['subject'], group?: Group) => changes.filter((c) => c.subject === subject && (!group || groupOf(c) === group))

/** "2 added · 5 modified · 1 removed", or '' when nothing of that kind changed. */
export function countLine(changes: readonly Change[], subject: Change['subject']): string {
  return GROUPS.map((g) => [of(changes, subject, g).length, g] as const).filter(([n]) => n > 0).map(([n, g]) => `${n} ${g}`).join(' · ')
}

function variableRow(c: Change, group: Group) {
  const changed = c.modeValues.filter((m) => m.state === 'changed')
  const first = changed[0] ?? c.modeValues[0]
  const scope = c.modeValues.length > 1 ? (changed.length === c.modeValues.length || group !== 'modified' ? 'All brands' : changed.map((m) => m.mode).join(', ')) : undefined
  return {
    name: c.name.slice(0, 200),
    valueKind: c.preview === 'color' ? 'color' as const : 'number' as const,
    ...(group !== 'added' && first ? { old: (first.old ?? first.value ?? '—').slice(0, 120) } : {}),
    ...(group !== 'removed' && first ? { new: (first.new ?? first.value ?? '—').slice(0, 120) } : {}),
    ...(scope ? { scope: scope.slice(0, 120) } : {}),
    ...(c.usedIn.length ? { note: `Used by ${c.usedIn.join(', ')}`.slice(0, 300) } : {}),
    ...(c.breaking ? { breaking: true } : {}),
  }
}

const componentRow = (c: Change) => ({ name: c.name.slice(0, 200), valueKind: 'text' as const, note: c.detail.slice(0, 300), ...(c.breaking ? { breaking: true } : {}) })

function sections(changes: readonly Change[]): HistorySection[] {
  const out: HistorySection[] = []
  if (of(changes, 'variable').length) {
    out.push({ kind: 'changes', title: 'Variable changes', unit: 'variable', groups: GROUPS.map((g) => ({ change: g, rows: of(changes, 'variable', g).slice(0, MAX_ROWS).map((c) => variableRow(c, g)) })) })
  }
  if (of(changes, 'component').length) {
    out.push({ kind: 'changes', title: 'Component changes', unit: 'component', groups: GROUPS.map((g) => ({ change: g, rows: of(changes, 'component', g).slice(0, MAX_ROWS).map(componentRow) })) })
  }
  return out
}

/** "Button, Chip and 3 more" — the default title, from the components (else variables) that changed. */
export function draftTitle(changes: readonly Change[], branch: string): string {
  const named = branch.trim()
  if (named) return named.slice(0, 160)
  const names = [...new Set((of(changes, 'component').length ? of(changes, 'component') : changes).map((c) => c.name.split('/')[0]!.trim()))]
  if (!names.length) return 'Changelog'
  return `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}`.slice(0, 160)
}

export interface ChangelogInput {
  changes: readonly Change[]
  title: string
  /** What the author wrote about the change; '' for none. */
  notes: string
  /** Jira key, or '' for none. */
  ticket: string
  by: string
  team: string
  /** The open file's name (the branch's, on a branch). */
  file: string
  /** The main file's name. */
  main: string
  page: string
  /** What could not be compared. */
  warnings: readonly string[]
  /** HH:MM (UTC) of the compare. */
  time: string
}

/** The entry a submitted changelog starts as: under review until a teammate approves it. */
export function changelogEntry(i: ChangelogInput): NewHistoryEntry {
  const variables = of(i.changes, 'variable'), components = of(i.changes, 'component')
  const breaking = i.changes.filter((c) => c.breaking)
  const summary = `${[variables.length && plural(variables.length, 'variable change'), components.length && plural(components.length, 'component change')].filter(Boolean).join(' and ') || 'No changes'} on ${i.file}, compared with ${i.main}.`
  return {
    type: 'changelog',
    status: 'review',
    title: (i.title.trim() || draftTitle(i.changes, '')).slice(0, 160),
    summary: `Changelog waiting for review · ${i.file} → ${i.main}`.slice(0, 300),
    by: { name: i.by.slice(0, 120), ...(i.team ? { team: i.team.slice(0, 80) } : {}) },
    file: i.file.slice(0, 200) || 'Figma file',
    ...(i.ticket ? { ticket: i.ticket } : {}),
    ...(variables.length ? { variables: countLine(i.changes, 'variable') } : {}),
    ...(components.length ? { components: countLine(i.changes, 'component') } : {}),
    details: {
      description: (i.notes.trim() || summary).slice(0, 2000),
      facts: [
        { label: 'Branch', value: i.file.slice(0, 300) || '—' },
        { label: 'Compared with', value: `${i.main} (main file)`.slice(0, 300) },
        { label: 'Page', value: i.page.slice(0, 300) || '—' },
        { label: 'Review', value: 'Waiting for a teammate' },
      ],
      stats: [
        { value: String(variables.length), label: 'Variables changed' },
        { value: String(components.length), label: 'Components changed' },
        { value: String(breaking.length), label: 'Breaking' },
      ],
      ...(breaking.length
        ? { notice: { tone: 'error' as const, title: plural(breaking.length, 'breaking change'), body: `${breaking.slice(0, 12).map((c) => c.name).join(', ')} ${breaking.length === 1 ? 'was' : 'were'} removed or renamed.`.slice(0, 600) } }
        : i.warnings.length ? { notice: { tone: 'info' as const, title: 'Not everything was compared', body: i.warnings.join(' ').slice(0, 600) } } : {}),
      sections: sections(i.changes),
      activity: [
        { title: `Compared ${i.file} with ${i.main}`.slice(0, 160), detail: `${plural(variables.length, 'variable change')} · ${plural(components.length, 'component change')}`, time: i.time },
        { title: 'Submitted for review', detail: i.by.slice(0, 300), time: i.time },
      ],
    },
  }
}

export const isPending = (e: HistoryEntry): boolean => e.type === 'changelog' && e.status === 'review'

export interface Approval {
  by: string
  /** ISO time of the approval. */
  at: string
  /** Where the published changelog can be read; https only. */
  link?: { url: string; label: string }
}

/** The same entry, approved: done, credited to the reviewer and linked to the published changelog. */
export function approveEntry(entry: HistoryEntry, a: Approval): HistoryEntry {
  const d = entry.details ?? {}
  return {
    ...entry,
    status: 'done',
    summary: `Changelog approved by ${a.by} · ${entry.file}`.slice(0, 300),
    review: { by: a.by.slice(0, 120), at: a.at },
    ...(a.link ? { link: a.link } : {}),
    details: {
      ...d,
      facts: [...(d.facts ?? []).filter((f) => f.label !== 'Review'), { label: 'Review', value: `Approved by ${a.by}`.slice(0, 300) }].slice(0, 12),
      activity: [...(d.activity ?? []), { title: 'Approved and published', detail: a.by.slice(0, 300), time: a.at.slice(11, 16) }].slice(-30),
    },
  }
}

/** .bluebird/history → .bluebird/DESIGN-CHANGELOG.md; a top-level folder keeps the file inside it. */
export function changelogPath(folder: string): string {
  const parent = folder.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : folder
  return `${parent}/${CHANGELOG_FILE}`
}

/** One line of Markdown never carries a line break or a table/heading marker from a layer name. */
const inline = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/([\\`*_[\]<>|#])/g, '\\$1').trim()

/** The entry as a Markdown section: who, when, the ticket, then Added / Updated / Deleted per kind. */
export function changelogMarkdown(entry: HistoryEntry): string {
  const lines = [`## ${entry.at.slice(0, 10)} · ${inline(entry.title)}${entry.ticket ? ` (${entry.ticket})` : ''}`, '']
  lines.push(`- Changed by: ${inline(entry.by.name)}${entry.by.team ? `, ${inline(entry.by.team)}` : ''}`)
  if (entry.review) lines.push(`- Approved by: ${inline(entry.review.by)} on ${entry.review.at.slice(0, 10)}`)
  lines.push(`- File: ${inline(entry.file)}`)
  if (entry.ticket) lines.push(`- Jira: ${entry.ticket}`)
  const description = entry.details?.description
  if (description) lines.push('', inline(description))
  for (const section of entry.details?.sections ?? []) {
    if (section.kind !== 'changes') continue
    lines.push('', `### ${inline(section.title)}`)
    for (const group of section.groups) {
      if (!group.rows.length) continue
      lines.push('', `**${LABEL[group.change]}**`, '')
      for (const r of group.rows) {
        const value = r.valueKind === 'text' ? r.note ?? '' : [r.old, r.new].filter(Boolean).join(' → ')
        lines.push(`- \`${r.name.replace(/[`\r\n]/g, '')}\`${value ? ` — ${inline(value)}` : ''}${r.scope ? ` (${inline(r.scope)})` : ''}${r.breaking ? ' **breaking**' : ''}`)
      }
    }
  }
  return `${lines.join('\n')}\n`
}

/** The changelog file with `section` on top, newest first. */
export function prependChangelog(existing: string | null, section: string): string {
  const raw = existing ?? ''
  // A file saved by an editor may start with a byte-order mark.
  const body = (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).trim()
  const rest = body.startsWith(HEADING) ? body.slice(HEADING.length).trim() : body
  return `${HEADING}\n\n${section.trim()}\n${rest ? `\n${rest}\n` : ''}`
}
