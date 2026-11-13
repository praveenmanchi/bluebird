// The Teams / Power Automate payload: what every tab that notifies a channel posts.
//
// It is a MessageCard so a classic Incoming Webhook still renders `title` and `text`.
// A Power Automate flow receives the same JSON and builds its own Adaptive Card from
// the discrete keys after them, so it never has to parse prose. The contract is in
// docs/teams-notifications.md — rename a key here and every flow built on it breaks.
import type { Change, ChangeKind } from '@shared/design/types'

/** Rows the table carries; breaking rows sort first so the cap never hides one. */
export const MAX_CARD_CHANGES = 15
/** A side that does not exist (an added variable has no "from"), or has no single value. */
export const NONE = '—'

const COLOR_ROUTINE = '0C8CE9'
const COLOR_BREAKING = 'D64045'

/** One table row. Every field is already a display string, so the flow needs no expressions. */
export interface CardChange {
  name: string
  kind: ChangeKind
  from: string
  to: string
  /** Component names, pre-joined with ", "; — when none. */
  usedIn: string
  breaking: boolean
}

/** The numbers and names a flow tabulates or branches on. */
export interface CardFacts {
  /** One flow can serve both tabs. */
  kind: 'extraction' | 'release'
  /** Display name only; omitted from the payload when empty. */
  actor: string
  repo: string
  /** The branch pushed to, or the release version. */
  ref: string
  added: number
  modified: number
  removed: number
  breaking: number
  impacted: readonly string[]
}

export interface CardInput {
  title: string
  /** Paragraphs of the pre-formatted `text`. */
  lines: readonly string[]
  facts?: CardFacts
  changes?: readonly Change[]
  link?: string
  linkLabel?: string
}

/** The one value every entry shares, or null. */
function single(values: readonly (string | undefined)[]): string | null {
  const all = [...new Set(values)]
  return all.length === 1 && all[0] !== undefined ? all[0] : null
}

/** A change as a table row. Modes that moved differently have no single pair, so both sides are —. */
export function cardChange(change: Change): CardChange {
  const moved = change.modeValues.filter((m) => m.state === 'changed')
  const value = single(change.modeValues.map((m) => m.value)) ?? NONE
  let from = NONE, to = NONE
  if (change.kind === 'added') to = value
  else if (change.kind === 'removed') from = value
  else if (moved.length) {
    const pair = single(moved.map((m) => `${m.old ?? NONE}\u0000${m.new ?? NONE}`))
    if (pair) [from, to] = pair.split('\u0000') as [string, string]
  } else {
    from = to = value // a rename or deprecation: the value did not move
  }
  return { name: change.name, kind: change.kind, from, to, usedIn: change.usedIn.length ? change.usedIn.join(', ') : NONE, breaking: change.breaking }
}

/** The rows the card shows, breaking first, capped at MAX_CARD_CHANGES, and how many there were. */
export function cardChanges(changes: readonly Change[]): { rows: CardChange[]; total: number } {
  const ordered = changes.map((c, i) => ({ c, i })).sort((a, b) => Number(b.c.breaking) - Number(a.c.breaking) || a.i - b.i)
  return { rows: ordered.slice(0, MAX_CARD_CHANGES).map(({ c }) => cardChange(c)), total: changes.length }
}

/** The link as text. Teams drops MessageCard buttons and prints [label](url) literally, so it is a bare URL. */
export function linkLine(link: string, label: string): string {
  return `${label}: ${link}`
}

/** The card as the JSON body of the POST. */
export function cardPayload(input: CardInput): string {
  const { title, lines, facts, link } = input
  const label = input.linkLabel ?? 'Open on GitHub'
  const table = input.changes?.length ? cardChanges(input.changes) : null
  return JSON.stringify({
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: title,
    title,
    text: [...lines, ...(link ? [linkLine(link, label)] : [])].join('\n\n'),
    ...(facts ? {
      themeColor: facts.breaking > 0 ? COLOR_BREAKING : COLOR_ROUTINE,
      kind: facts.kind,
      ...(facts.actor.trim() ? { actor: facts.actor.trim() } : {}),
      repo: facts.repo,
      ref: facts.ref,
      added: facts.added,
      modified: facts.modified,
      removed: facts.removed,
      breaking: facts.breaking,
      impacted: facts.impacted,
      // Routine changes post quietly; a breaking one asks the flow to tag the channel.
      notify: facts.breaking > 0 ? 'channel' : 'none',
    } : {}),
    ...(table ? { changes: table.rows, changesShown: table.rows.length, changesTotal: table.total } : {}),
    ...(link ? { link, linkLabel: label } : {}),
  })
}

/** The plain card — title, paragraphs and the link line — for posts with nothing to tabulate. */
export function channelCard(title: string, lines: readonly string[], link?: string, linkLabel?: string): string {
  return cardPayload({ title, lines, link, linkLabel })
}
