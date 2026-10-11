// Answers grounded in the Dual File libraries: the question picks variables and
// components out of the index (search), and the selection is checked against it
// (which bindings and instances come from which library file). Pure; no RPC.
import { queryTerms, searchComponents, searchVariables, type LibraryComponent, type LibraryIndex, type LibraryVariable } from '@shared/libraries'
import type { MetaBadgeTone } from '@shared/ui'
import type { AnswerKind, CannedAnswer, Source, Suggestion } from './fixtures'
import type { SelectionContext } from './messages'

/** Where a binding or instance in the selection comes from. */
export type Origin = 'library' | 'local' | 'other'

export interface SelectionVariable {
  name: string
  properties: readonly string[]
  layers: number
  origin: Origin
  /** The library variable it resolves to (by key, or by name when the key differs). */
  match?: LibraryVariable
  byName?: boolean
}

export interface SelectionComponent { name: string; count: number; origin: Origin; match?: LibraryComponent; byName?: boolean }

export interface SelectionReport {
  layer: string
  truncated: boolean
  /** Other selected layers that weren't read. */
  others: number
  variables: readonly SelectionVariable[]
  components: readonly SelectionComponent[]
}

/** A canned-answer-shaped reply plus what it cites. */
export interface GroundedAnswer extends CannedAnswer {
  variables?: { items: readonly LibraryVariable[]; total: number }
  components?: { items: readonly LibraryComponent[]; total: number }
  selection?: SelectionReport
  /** fileKey → file name, for citations. */
  files: Readonly<Record<string, string>>
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const list = (items: readonly string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/** While the libraries are being searched (before steps are known). */
export const PENDING_ANSWER: GroundedAnswer = {
  text: '', searching: 'Searching your libraries…', hint: 'Reading the Dual File libraries…', steps: [], thoughtFor: '', followUps: [], files: {},
}

export function failedAnswer(message: string): GroundedAnswer {
  return { ...PENDING_ANSWER, text: `I couldn’t read your libraries: ${message}`, thoughtFor: 'Stopped early' }
}

/** Claude's reply in place of the library summary; the artifacts and steps stay, plus the Claude step. */
export function withClaude(answer: GroundedAnswer, text: string, model: string): GroundedAnswer {
  return { ...answer, text, steps: [...answer.steps, `Asked Claude (${model}) with what matched`], thoughtFor: `Answered by Claude · ${model}` }
}

/** Claude failed: keep the library answer and say why Claude's is missing. */
export function withoutClaude(answer: GroundedAnswer, reason: string): GroundedAnswer {
  return { ...answer, text: `${answer.text} (Claude couldn’t answer: ${reason})` }
}

/** The selection couldn't be read from Figma (the libraries are fine). */
export function selectionFailedAnswer(message: string): GroundedAnswer {
  return { ...PENDING_ANSWER, text: `I couldn’t read your selection in Figma: ${message} Select the layer again and ask once more.`, thoughtFor: 'Stopped early' }
}

/** name → item, leaving out names more than one item carries (a name match there could pick the wrong file). */
function uniqueByName<T extends { name: string }>(items: readonly T[]): Map<string, T> {
  const seen = new Map<string, T | null>()
  for (const item of items) seen.set(item.name, seen.has(item.name) ? null : item)
  return new Map([...seen].filter((e): e is [string, T] => e[1] !== null))
}

/** Only the files whose Source is ticked. */
export function selectIndex(index: LibraryIndex, fileKeys: ReadonlySet<string>): LibraryIndex {
  const keep = <T extends { fileKey: string }>(xs: readonly T[]) => xs.filter((x) => fileKeys.has(x.fileKey))
  return { ...index, files: keep(index.files), variables: keep(index.variables), components: keep(index.components), collections: keep(index.collections) }
}

/** "#0C8CE9 in Bridge, #161616 in Ikea and 3 more modes". */
export function modeSummary(v: LibraryVariable, shown = 3): string {
  const head = v.values.slice(0, shown).map((m) => (v.values.length > 1 ? `${m.value} in ${m.mode}` : m.value))
  const more = v.values.length - shown
  return more > 0 ? `${head.join(', ')} and ${plural(more, 'more mode')}` : list(head)
}

function fileNames(index: LibraryIndex): Record<string, string> {
  return Object.fromEntries(index.files.map((f) => [f.fileKey, f.name]))
}

const filesWith = (index: LibraryIndex, role: 'variables' | 'components') => index.files.filter((f) => f.roles.includes(role) && !f.error)

function variableAnswer(prompt: string, index: LibraryIndex, hits: ReturnType<typeof searchVariables>): GroundedAnswer {
  const files = filesWith(index, 'variables')
  const terms = queryTerms(prompt).map((g) => g[0]).join(' ')
  const top = hits.items[0]!
  const names = fileNames(index)
  return {
    text: `${top.name} (${[names[top.fileKey], top.collection].filter((x, i, a) => x && a.indexOf(x) === i).join(' › ')}) is ${modeSummary(top)}.${top.description ? ` ${top.description}.` : ''}${hits.total > 1 ? ` ${plural(hits.total - 1, 'other variable')} also match “${terms || prompt}”.` : ''}`,
    searching: 'Searching your variables…',
    hint: `Reading ${list(files.map((f) => f.name))}…`,
    steps: [
      `Searched ${list(files.map((f) => f.name))} (${plural(index.variables.length, 'variable')}, ${plural(index.collections.length, 'collection')})`,
      `Matched ${plural(hits.total, 'variable')}${terms ? ` for “${terms}”` : ''}`,
    ],
    thoughtFor: 'Read from the Variables file',
    followUps: [
      { label: 'Check my selection against the libraries', icon: 'component-select' },
      ...(filesWith(index, 'components').length ? [{ label: 'Show me the Button component', icon: 'component' } satisfies Suggestion] : []),
    ],
    variables: hits,
    files: names,
  }
}

function componentAnswer(prompt: string, index: LibraryIndex, hits: ReturnType<typeof searchComponents>): GroundedAnswer {
  const files = filesWith(index, 'components')
  const top = hits.items[0]!
  const names = fileNames(index)
  const what = top.kind === 'set' ? `a component set with ${plural(top.variants, 'variant')}` : 'a component'
  return {
    text: `${top.name} is ${what} in ${top.location || 'the library'} (${names[top.fileKey]}).${top.description ? ` ${top.description}.` : ''}${hits.total > 1 ? ` ${plural(hits.total - 1, 'more component')} match.` : ''} Open in Figma takes you to it in the library file.`,
    searching: 'Searching your components…',
    hint: `Reading ${list(files.map((f) => f.name))}…`,
    steps: [
      `Searched ${list(files.map((f) => f.name))} (${plural(index.components.length, 'published component')})`,
      `Matched ${plural(hits.total, 'component')}`,
    ],
    thoughtFor: 'Read from the Components file',
    followUps: [],
    components: hits,
    files: names,
  }
}

function nothingFound(prompt: string, index: LibraryIndex): GroundedAnswer {
  const files = index.files.filter((f) => !f.error)
  return {
    ...PENDING_ANSWER,
    text: files.length
      ? `Nothing in ${list(files.map((f) => f.name))} matches “${prompt}”. Try a variable or component name, like “surface/accent” or “Button”.`
      : 'None of the ticked library files could be read. Check Settings › Dual File Mode, or tick a source.',
    searching: 'Searching your libraries…',
    steps: [`Searched ${plural(index.variables.length, 'variable')} and ${plural(index.components.length, 'component')}`],
    thoughtFor: 'No match',
    files: fileNames(index),
  }
}

/** Ties the selection's bindings and instances to the library index: by key first, by name when a library was republished. */
export function checkSelection(selection: SelectionContext, index: LibraryIndex): SelectionReport {
  const varByKey = new Map(index.variables.map((v) => [v.key, v]))
  const varByName = uniqueByName(index.variables)
  const compByKey = new Map(index.components.flatMap((c) => c.keys.map((k) => [k, c] as const)))
  const compByName = uniqueByName(index.components)

  const variables = selection.variables.map((v): SelectionVariable => {
    const exact = varByKey.get(v.key)
    const named = exact ? undefined : v.remote ? varByName.get(v.name) : undefined
    const match = exact ?? named
    return { name: v.name, properties: v.properties, layers: v.layers, origin: match ? 'library' : v.remote ? 'other' : 'local', ...(match ? { match } : {}), ...(named ? { byName: true } : {}) }
  })
  const components = selection.components.map((c): SelectionComponent => {
    const exact = compByKey.get(c.key)
    const named = exact ? undefined : c.remote ? compByName.get(c.name) : undefined
    const match = exact ?? named
    return { name: c.name, count: c.count, origin: match ? 'library' : c.remote ? 'other' : 'local', ...(match ? { match } : {}), ...(named ? { byName: true } : {}) }
  })
  return { layer: selection.name, truncated: selection.truncated, others: Math.max(0, selection.selected - 1), variables, components }
}

function originSummary<T extends { origin: Origin; match?: { fileKey: string } }>(items: readonly T[], what: string, names: Record<string, string>): string {
  if (!items.length) return `no ${what}s`
  const byFile = new Map<string, number>()
  for (const i of items) if (i.match) byFile.set(names[i.match.fileKey] ?? i.match.fileKey, (byFile.get(names[i.match.fileKey] ?? i.match.fileKey) ?? 0) + 1)
  const local = items.filter((i) => i.origin === 'local').length
  const other = items.filter((i) => i.origin === 'other').length
  const parts = [
    ...[...byFile].map(([file, n]) => `${n} from ${file}`),
    ...(local ? [`${local} local to this file`] : []),
    ...(other ? [`${other} from a library you haven’t connected`] : []),
  ]
  return `${plural(items.length, what)} (${list(parts)})`
}

function selectionAnswer(selection: SelectionContext | null, index: LibraryIndex): GroundedAnswer {
  const names = fileNames(index)
  if (!selection) {
    return { ...PENDING_ANSWER, text: 'Select a layer in Figma, then ask again. I’ll check which of its variables and components come from your libraries.', thoughtFor: 'Nothing selected', files: names }
  }
  const report = checkSelection(selection, index)
  const unlinked = report.variables.filter((v) => v.origin !== 'library').length + report.components.filter((c) => c.origin !== 'library').length
  return {
    text: `${report.layer} binds ${originSummary(report.variables, 'variable', names)} and uses ${originSummary(report.components, 'component', names)}.${unlinked ? ` ${plural(unlinked, 'item')} ${unlinked === 1 ? 'isn’t' : 'aren’t'} from your connected libraries — check those first.` : ' Everything comes from your connected libraries.'}${report.truncated ? ' (Large selection: I read the first layers only.)' : ''}${report.others ? ` I read ${report.layer} only; select one layer at a time to check the other ${report.others}.` : ''}`,
    searching: 'Reading your selection…',
    hint: 'Reading your selection…',
    steps: [
      `Read ${report.layer} (${plural(selection.nodes, 'layer')})`,
      `Checked ${plural(report.variables.length, 'variable')} and ${plural(report.components.length, 'component')} against ${list(index.files.filter((f) => !f.error).map((f) => f.name))}`,
    ],
    thoughtFor: 'Checked against your libraries',
    followUps: [],
    selection: report,
    files: names,
  }
}

/**
 * The grounded reply for a question. Selection questions check the selection; component and
 * icon questions search components first; everything else searches variables first. When the
 * first search finds nothing, the other one gets a chance.
 */
export function groundedAnswer(prompt: string, kind: AnswerKind, index: LibraryIndex, selection?: SelectionContext | null): GroundedAnswer {
  if (kind === 'selection') return selectionAnswer(selection ?? null, index)
  const vars = searchVariables(index, prompt)
  const comps = searchComponents(index, prompt)
  const componentsFirst = kind === 'component' || kind === 'icons'
  if (componentsFirst ? comps.total : !vars.total && comps.total) return componentAnswer(prompt, index, comps)
  if (vars.total) return variableAnswer(prompt, index, vars)
  return nothingFound(prompt, index)
}

/** The Sources view's cards for the loaded library files. */
export function librarySources(index: LibraryIndex): Source[] {
  return index.files.map((f): Source => {
    const both = f.roles.length > 1
    const kind = both ? 'Variables + Components' : f.roles[0] === 'variables' ? 'Variables' : 'Components'
    const counts = [
      ...(f.roles.includes('variables') ? [`${plural(f.variables, 'variable')}${f.collections.length ? ` · ${plural(f.collections.length, 'collection')}` : ''}`] : []),
      ...(f.roles.includes('components') ? [plural(f.components, 'component')] : []),
    ]
    const tone: MetaBadgeTone = f.error ? 'danger' : f.warning ? 'warning' : 'success'
    return {
      id: f.fileKey,
      name: f.name,
      chip: f.name,
      meta: f.error ?? `${kind} · File ${f.slot} · ${counts.join(' · ')}${f.warning ? ` · ${f.warning}` : ''}`,
      icon: both ? 'layers' : f.roles[0] === 'variables' ? 'variables' : 'component',
      status: f.error ? 'Failed' : f.warning ? 'Check' : 'Indexed',
      statusTone: tone,
      selected: !f.error,
    }
  })
}
