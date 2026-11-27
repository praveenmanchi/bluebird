// What the Team setup block and the onboarding import step show about a settings file:
// which sections can be exported, and what an import will set up. The file format and the
// rules for applying it live in @shared/integrations/transfer.
import {
  applySettingsFile, isSecretField, parseSettingsFile, DEFAULT_INTEGRATIONS, MAX_SETTINGS_FILE_BYTES, PERSONAL_FIELDS,
  type IntegrationId, type IntegrationSettings, type ParsedSettingsFile, type ParseResult,
} from '@shared/integrations'
import { CONNECTION_KEYS, SECTIONS, flatFields, type LeafFieldSpec } from './sections'
import { sectionStatus } from './status'

/** What the Connection card's keys are called in a file summary. */
// The method is always set and a sign-in is never in a file, so neither is listed.
const CONNECTION_LABELS: Readonly<Record<string, string>> = { baseUrl: 'Address', siteUrl: 'Address', apiKey: 'API key', email: 'Email' }
const labels = (field: LeafFieldSpec): [string, string][] => {
  if (field.kind === 'provider') return [[field.model.key, field.model.label], [field.apiKey.key, field.apiKey.label]]
  if (field.kind === 'connection') return CONNECTION_KEYS[field.service].filter((key) => key in CONNECTION_LABELS).map((key) => [key, CONNECTION_LABELS[key]!])
  if (field.kind === 'gateway') return [[field.key, 'Company gateway']]
  if (field.kind === 'host') return [[field.key, 'Code host']]
  return [[field.key, field.kind === 'switch' ? field.title : field.label]]
}
/** "Repository (owner/repo)" → "Repository": short enough to list three in a row. */
const short = (label: string): string => label.replace(/\s*\(.*?\)/g, '').replace(/\s+-\s+.*$/, '').replace(/\s+—\s+/g, ' ').trim()
const FIELD_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.fromEntries(
  SECTIONS.map((spec) => [spec.id, Object.fromEntries(flatFields(spec.blocks).flatMap(labels).map(([key, label]) => [key, short(label)]))]),
)

export const sectionTitle = (id: IntegrationId): string => SECTIONS.find((s) => s.id === id)?.title ?? id

/** Text with something in it, or a list (Dual File's files) with at least one row that has an ID. */
const hasValue = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim() !== ''
  if (!Array.isArray(value)) return false
  return value.some((row) => typeof row !== 'object' || row === null || String((row as { id?: unknown }).id ?? '').trim() !== '')
}

/** "Repository, branch and 2 more": the filled-in text fields among `keys`. */
export function describeFields(id: IntegrationId, values: Readonly<Record<string, unknown>>, keys: readonly string[] = Object.keys(values)): string {
  const names = keys.filter((key) => hasValue(values[key]) && FIELD_LABELS[id]?.[key] !== undefined).map((key) => FIELD_LABELS[id]![key]!)
  if (names.length === 0) return 'Switches only'
  const shown = names.slice(0, 3)
  const rest = names.length - shown.length
  const text = rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}` : shown[0]!
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export interface ExportRow {
  id: IntegrationId
  title: string
  /** False for a section that is off or has nothing filled in: nothing to share. */
  available: boolean
  detail: string
}

const exportedKeys = (id: IntegrationId, values: Readonly<Record<string, unknown>>, includeKeys: boolean): string[] =>
  Object.keys(values).filter((key) => !(PERSONAL_FIELDS[id] ?? []).includes(key) && (includeKeys || !isSecretField(id, key)))

/** One row per Settings section, in page order, for the export checklist. */
export function exportRows(settings: IntegrationSettings, includeKeys: boolean): ExportRow[] {
  return SECTIONS.map((spec): ExportRow => {
    const values = settings[spec.id] as unknown as Record<string, unknown>
    const status = sectionStatus(spec.id, settings[spec.id], settings)
    const keys = exportedKeys(spec.id, values, includeKeys)
    const filled = keys.some((key) => hasValue(values[key]) && values[key] !== (DEFAULT_INTEGRATIONS[spec.id] as Record<string, unknown>)[key])
    if (status === 'off') return { id: spec.id, title: spec.title, available: false, detail: 'Turned off' }
    if (!filled) return { id: spec.id, title: spec.title, available: false, detail: 'Not configured yet' }
    return { id: spec.id, title: spec.title, available: true, detail: describeFields(spec.id, values, keys) }
  })
}

export type ImportRowStatus = 'pass' | 'warning' | 'fail'
export interface ImportRow { id: IntegrationId; title: string; status: ImportRowStatus; detail: string }
export interface ImportSummary {
  rows: readonly ImportRow[]
  /** Sections that work as soon as the file is applied. */
  ready: number
  /** Sections that are set up but still wait for a key from the person. */
  needsKey: number
  /** Sections the file has but that can't be used. */
  skipped: number
}

const NEEDS_KEY: Partial<Readonly<Record<IntegrationId, string>>> = {
  dualFile: 'Needs your own Figma access token.',
  ai: 'No API key in the file: add your own.',
}

/** What applying `file` to `current` gives, section by section, in Settings page order. */
export function summarizeImport(file: ParsedSettingsFile, current: IntegrationSettings, keepExisting: boolean): ImportSummary {
  const merged = applySettingsFile(current, file.sections, { keepExisting })
  const rows = SECTIONS.flatMap((spec): ImportRow[] => {
    const skipped = file.skipped.find((s) => s.id === spec.id)
    if (skipped) return [{ id: spec.id, title: spec.title, status: 'fail', detail: `Left out: ${skipped.reason}` }]
    const patch = file.sections[spec.id]
    if (!patch) return []
    const status = sectionStatus(spec.id, merged[spec.id], merged)
    const what = describeFields(spec.id, patch)
    if (status === 'off') return [{ id: spec.id, title: spec.title, status: 'pass', detail: `${what}. Turned off in the file.` }]
    if (status === 'missing') return [{ id: spec.id, title: spec.title, status: 'warning', detail: `${what}. ${NEEDS_KEY[spec.id] ?? 'Still needs a key from you.'}` }]
    return [{ id: spec.id, title: spec.title, status: 'pass', detail: what }]
  })
  const count = (status: ImportRowStatus) => rows.filter((r) => r.status === status).length
  return { rows, ready: count('pass'), needsKey: count('warning'), skipped: count('fail') }
}

export interface ChosenFile { name: string; result: ParseResult; raw: unknown }

/** Reads a picked or dropped file. `raw` is the parsed JSON the sandbox checks again before storing. */
export async function readSettingsFile(file: Pick<File, 'name' | 'size' | 'text'>): Promise<ChosenFile> {
  if (file.size > MAX_SETTINGS_FILE_BYTES) return { name: file.name, raw: null, result: { ok: false, message: 'The file is too large to be a settings file, so nothing was changed.' } }
  let text: string
  try { text = await file.text() } catch { return { name: file.name, raw: null, result: { ok: false, message: 'The file couldn’t be read. Try choosing it again.' } } }
  const result = parseSettingsFile(text)
  return { name: file.name, result, raw: result.ok ? JSON.parse(text) as unknown : null }
}

/** "Exported on 13 Nov 2026 · Bridge · 6 sections · API keys included" */
export function fileMeta(file: ParsedSettingsFile): string {
  const date = file.exportedAt ? new Date(file.exportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const count = Object.keys(file.sections).length
  return [date ? `Exported on ${date}` : null, file.brand, `${count} section${count === 1 ? '' : 's'}`, file.includesKeys ? 'API keys included' : 'no API keys'].filter(Boolean).join(' · ')
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "5 sections were set up. 1 still needs a key from you." */
export function appliedMessage(summary: ImportSummary, fileName: string): string {
  const total = summary.ready + summary.needsKey
  const head = `${plural(total, 'section was', 'sections were')} set up from ${fileName}.`
  const needs = summary.needsKey > 0 ? ` ${plural(summary.needsKey, 'still needs', 'still need')} a key from you.` : ''
  const skipped = summary.skipped > 0 ? ` ${plural(summary.skipped, 'section was', 'sections were')} left out.` : ''
  return head + needs + skipped
}
