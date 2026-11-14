// What UX AI sends the model: a system prompt that keeps it to the Dual File
// libraries, and a compact text context built from the same search the
// artifacts come from (with more hits than the artifacts show). Pure.
import { fileLabel, searchComponents, searchStyles, searchVariables, type LibraryIndex, type LibraryStyle, type LibraryVariable } from '@shared/libraries'
import type { AnswerKind } from './fixtures'
import type { SelectionReport } from './grounding'

/** How much of the library goes into one question, and how much conversation comes along. */
export const CONTEXT_VARIABLES = 25
export const CONTEXT_COMPONENTS = 15
export const CONTEXT_STYLES = 12
export const HISTORY_TURNS = 4
export const MAX_CONTEXT_CHARS = 14_000

export function systemPrompt(instructions: string): string {
  return [
    'You are UX AI, an assistant inside a Figma plugin for a multi-brand design system.',
    'Answer only from the library context in the user message: variables (with their value in each brand mode), published components, published text and colour styles, and what the designer has selected. If the context doesn’t answer the question, say what is missing instead of guessing.',
    'Use variable and component names exactly as written. Mention brand modes when values differ between them.',
    'Reply in plain text (no Markdown, no lists unless asked), in at most about 120 words. The plugin shows the matching variables and components under your reply, so don’t repeat every value.',
    ...(instructions ? [`The design-system team’s instructions:\n${instructions}`] : []),
  ].join('\n\n')
}

const variableLine = (v: LibraryVariable) =>
  `- ${v.name} [${v.type}, ${v.collection}] ${v.values.map((m) => `${m.mode} ${m.value}${m.aliasOf ? ` (→ ${m.aliasOf})` : ''}`).join(' · ')}${v.description ? ` — ${v.description}` : ''}`

const styleLine = (s: LibraryStyle) => s.kind === 'text'
  ? `- text style ${s.name}: ${s.fontFamily} ${s.fontStyle} ${s.fontSize}${s.lineHeight ? `/${s.lineHeight}` : ''}${s.letterSpacing ? ` ls ${s.letterSpacing}` : ''}${s.description ? ` — ${s.description}` : ''}`
  : `- colour style ${s.name}: ${s.hex ?? 'not a solid colour'}${s.description ? ` — ${s.description}` : ''}`

function selectionLines(report: SelectionReport, files: Record<string, string>): string[] {
  const from = (match?: { fileKey: string }, origin?: string) => match ? `from ${files[match.fileKey] ?? match.fileKey}` : origin === 'local' ? 'local to this file' : 'from a library that isn’t connected'
  return [
    `Selected layer: ${report.layer}${report.others ? ` (plus ${report.others} more selected, not read)` : ''}`,
    ...report.variables.map((v) => `- variable ${v.name} (${v.properties.join(', ')}; ${v.layers} layer(s)) ${from(v.match, v.origin)}${v.byName ? ' (matched by name)' : ''}`),
    ...report.components.map((c) => `- component ${c.name} ×${c.count} ${from(c.match, c.origin)}`),
  ]
}

/** The library context for one question, capped so a huge library can't blow the request up. */
export function libraryContext(prompt: string, kind: AnswerKind, index: LibraryIndex, selection?: SelectionReport): string {
  const files = Object.fromEntries(index.files.map((f) => [f.fileKey, f.name]))
  const vars = searchVariables(index, prompt, CONTEXT_VARIABLES)
  const comps = searchComponents(index, prompt, CONTEXT_COMPONENTS)
  const styles = searchStyles(index, prompt, CONTEXT_STYLES)
  const lines = [
    'Library files:',
    ...index.files.map((f) => `- ${fileLabel(f)} “${f.name}” (${f.roles.join(' + ')})${f.error ? `: could not be read — ${f.error}` : `: ${f.variables} variables${f.collections.length ? ` in ${f.collections.join(', ')}` : ''}, ${f.components} published components`}`),
    `Collections and modes: ${index.collections.map((c) => `${c.name} [${c.modes.join(', ')}]`).join('; ') || 'none'}`,
    '',
    `Variables matching the question (${vars.items.length} of ${vars.total}):`,
    ...(vars.items.length ? vars.items.map(variableLine) : ['- none']),
    '',
    `Components matching the question (${comps.items.length} of ${comps.total}):`,
    ...(comps.items.length ? comps.items.map((c) => `- ${c.name} (${c.kind === 'set' ? `set, ${c.variants} variants` : 'component'}) — ${c.location}${c.description ? ` — ${c.description}` : ''} [${files[c.fileKey] ?? c.fileKey}]`) : ['- none']),
    ...(styles.total ? ['', `Published styles matching the question (${styles.items.length} of ${styles.total}):`, ...styles.items.map(styleLine)] : []),
    ...(kind === 'selection' && selection ? ['', ...selectionLines(selection, files)] : []),
  ]
  const text = lines.join('\n')
  return text.length > MAX_CONTEXT_CHARS ? `${text.slice(0, MAX_CONTEXT_CHARS)}\n… (context cut to fit)` : text
}

export interface PriorTurn { prompt: string; answer: string }

/** The conversation so far (last few answered turns), then this question with its context. */
export function buildMessages(history: readonly PriorTurn[], prompt: string, context: string): { role: 'user' | 'assistant'; content: string }[] {
  return [
    ...history.slice(-HISTORY_TURNS).flatMap((t) => [{ role: 'user' as const, content: t.prompt }, { role: 'assistant' as const, content: t.answer }]),
    { role: 'user', content: `${context}\n\nQuestion: ${prompt}` },
  ]
}
