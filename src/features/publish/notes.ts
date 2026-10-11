// Pure: release notes drafted from the diff. The designer edits them before publishing.
import type { Change, ModeValue } from './types'

/** "Bridge, Ikea and Richemont"; "all brands" when every mode is listed. */
function modeList(modes: readonly ModeValue[], changed: readonly ModeValue[]): string {
  if (changed.length === modes.length) return modes.length > 1 ? 'all brands' : (changed[0]?.mode ?? '')
  const names = changed.map((m) => m.mode)
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export function draftNote(change: Change): string {
  if (change.subject === 'component') {
    if (change.kind === 'added') return `New component: ${change.name} (${change.detail.replace(/^New · /, '')}).`
    if (change.kind === 'removed') return `Removed ${change.name} from the library.`
    if (change.kind === 'deprecated') {
      const extra = change.detail.replace(/^Deprecated\s*[—:-]?\s*/i, '').trim()
      return extra ? `${change.name} is deprecated — ${extra}` : `${change.name} is deprecated.`
    }
    return `${change.name}: ${change.detail}.`
  }
  if (change.kind === 'added') return `New variable ${change.name} (${change.detail.replace(/^New · /, '')}).`
  if (change.kind === 'removed') {
    return change.usedIn.length
      ? `Removed ${change.name}. ${listNames(change.usedIn)} used it — point them at a replacement before updating.`
      : `Removed ${change.name}.`
  }
  if (change.kind === 'deprecated') return `${change.name} is deprecated.`
  const changed = change.modeValues.filter((m) => m.state === 'changed')
  const olds = new Set(changed.map((m) => m.old)), news = new Set(changed.map((m) => m.new))
  if (changed.length && olds.size === 1 && news.size === 1) {
    return `${change.name} changed from ${[...olds][0]} to ${[...news][0]} in ${modeList(change.modeValues, changed)}.`
  }
  if (changed.length) return `${change.name} changed in ${modeList(change.modeValues, changed)}.`
  return `${change.name}: ${change.detail}.`
}

/** A release title from the most notable changes: "Date picker, button/bg/primary and 10 more". */
export function draftTitle(changes: readonly Change[]): string {
  if (!changes.length) return ''
  const picked = [...changes].sort((a, b) => Number(b.subject === 'component') - Number(a.subject === 'component')).slice(0, 2).map((c) => c.name)
  const rest = changes.length - picked.length
  return rest > 0 ? `${picked.join(', ')} and ${rest} more` : picked.join(' and ')
}

/** The changelog in Markdown, for the repository commit and the clipboard. */
export function changelogMarkdown(version: string, title: string, entries: ReadonlyArray<{ change: Change; text: string }>): string {
  const sections: Array<[Change['kind'], string]> = [['removed', 'Breaking'], ['added', 'Added'], ['modified', 'Changed'], ['deprecated', 'Deprecated']]
  const body = sections
    .map(([kind, heading]) => {
      const items = entries.filter((e) => e.change.kind === kind)
      return items.length ? `### ${heading}\n${items.map((e) => `- **${e.change.name}** — ${e.text}`).join('\n')}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
  return `## ${version} — ${title}\n\n${body}\n`
}
