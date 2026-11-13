// Pure: what a changelog tells the outside world — the Figma branch link, the
// Jira comment when it is sent for review and when it is approved, and the
// reviewer notification. No Figma, no network.
import type { Change } from '@shared/design/types'
import type { HistoryEntry } from '@shared/history/types'
import { countLine } from './changelog'

/** The fact on a changelog entry that holds the branch link. */
export const BRANCH_FACT = 'Figma branch'
/** Changes listed in a comment; the rest are counted. */
export const COMMENT_ROWS = 12

const slug = (name: string) => name.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'branch'
const KEY = /^[A-Za-z0-9]{4,128}$/

/** figma.com/design/<main>/branch/<branch>/<name>: opens the branch itself. '' when a key looks wrong. */
export function branchUrl(mainKey: string, branchKey: string, name: string): string {
  if (!KEY.test(mainKey) || !KEY.test(branchKey)) return ''
  return `https://www.figma.com/design/${mainKey}/branch/${branchKey}/${slug(name)}`
}

/** The branch link saved on the entry, if it has one. */
export function entryBranchUrl(entry: HistoryEntry): string {
  const value = entry.details?.facts?.find((f) => f.label === BRANCH_FACT)?.value ?? ''
  return /^https:\/\/www\.figma\.com\/\S+$/.test(value) ? value : ''
}

/** One line per change: "surface/translucent removed", "button/bg/primary #0C8CE9 → #0978C8". */
export function changeLine(c: Change): string {
  const values = c.subject === 'variable' && c.kind === 'modified'
    ? (() => { const m = c.modeValues.find((v) => v.state === 'changed'); return m?.old && m?.new ? ` ${m.old} → ${m.new}` : '' })()
    : ''
  return `- ${c.name} ${c.kind}${values}${c.subject === 'component' && c.detail ? ` (${c.detail})` : ''}`
}

function changeLines(changes: readonly Change[]): string[] {
  const shown = changes.slice(0, COMMENT_ROWS).map(changeLine)
  return changes.length > COMMENT_ROWS ? [...shown, `- and ${changes.length - COMMENT_ROWS} more (all of them are in Bluebird History)`] : shown
}

export interface SubmitCommentInput {
  title: string
  notes: string
  file: string
  main: string
  by: string
  changes: readonly Change[]
  branch: string
}

/** The Jira comment the designer's submit posts. */
export function submitComment(i: SubmitCommentInput): string {
  const variables = i.changes.filter((c) => c.subject === 'variable')
  const components = i.changes.filter((c) => c.subject === 'component')
  const lines = [`Changelog sent for review: ${i.title}`, `${i.file} compared with ${i.main} · by ${i.by}`]
  if (i.notes.trim()) lines.push('', i.notes.trim())
  if (variables.length) lines.push('', `Variables (${countLine(i.changes, 'variable')})`, ...changeLines(variables))
  if (components.length) lines.push('', `Components (${countLine(i.changes, 'component')})`, ...changeLines(components))
  if (!i.changes.length) lines.push('', 'No variable or component changes.')
  if (i.branch) lines.push('', `Figma branch: ${i.branch}`)
  return lines.join('\n')
}

/** The Jira comment the reviewer's approval posts. */
export function approvalComment(entry: HistoryEntry, by: string, changelogUrl: string): string {
  const counts = [entry.variables && `Variables: ${entry.variables}`, entry.components && `Components: ${entry.components}`].filter(Boolean) as string[]
  const branch = entryBranchUrl(entry)
  return [
    `Changelog approved: ${entry.title}`,
    `Reviewed by ${by} · changed by ${entry.by.name}`,
    ...(counts.length ? ['', ...counts] : []),
    '',
    changelogUrl ? `Added to the design changelog: ${changelogUrl}` : 'Added to the design changelog.',
    ...(branch ? [`Figma branch: ${branch}`] : []),
  ].join('\n')
}

/** The reviewer notification's paragraphs. */
export function reviewLines(i: SubmitCommentInput, ticket: string): string[] {
  return [
    `${i.by} sent "${i.title}" for review: ${i.file} compared with ${i.main}.`,
    [countLine(i.changes, 'variable') && `Variables: ${countLine(i.changes, 'variable')}`, countLine(i.changes, 'component') && `Components: ${countLine(i.changes, 'component')}`].filter(Boolean).join(' · ') || 'No variable or component changes.',
    ...(ticket ? [`Jira: ${ticket}`] : []),
    'Open Bluebird › History to review and approve it.',
  ]
}
