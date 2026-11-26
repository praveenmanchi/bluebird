// Team setup file: Settings › Integrations as one JSON a design system lead exports and the
// rest of the team imports. Pure functions, shared by the Settings block, the onboarding step
// and the sandbox store, which runs the same checks again before it writes anything.
import * as z from 'zod/mini'
import {
  DEFAULT_INTEGRATIONS, INTEGRATION_IDS, SECRET_FIELDS, migrateDualFile, migrateMcp, sectionSchemas,
  type IntegrationId, type IntegrationSettings, type IntegrationValues,
} from './schema'
import { validateIntegration } from './validate'

export const SETTINGS_FILE_KIND = 'bluebird-settings'
export const SETTINGS_FILE_VERSION = 1
/** A settings file is a few KB; anything this large is not one. */
export const MAX_SETTINGS_FILE_BYTES = 256 * 1024

/**
 * The Figma personal access token belongs to the person, not the team: it is never written to
 * the file and never read from one, whatever "Include API keys" says. The library files (names,
 * URLs, what each holds) carry no key, so they are shared like any other field.
 */
export const PERSONAL_FIELDS: { readonly [K in IntegrationId]?: readonly string[] } = {
  dualFile: ['token'],
  // Who signed in, and until when: a sign-in belongs to the person.
  github: ['signinAccount', 'signinExpires'],
  jira: ['signinAccount', 'signinExpires'],
}

/** A signed-in section's apiKey holds that person's sign-in token, so it never goes in a file, even with keys included. */
const signedInToken = (values: Record<string, unknown>, key: string): boolean => key === 'apiKey' && values.method === 'signin'

const isPersonal = (id: IntegrationId, key: string): boolean => (PERSONAL_FIELDS[id] ?? []).includes(key)
/** Keys, tokens and signed webhook URLs the team shares: in the file only when keys are included. */
const isSharedSecret = (id: IntegrationId, key: string): boolean => (SECRET_FIELDS[id] as readonly string[]).includes(key) && !isPersonal(id, key)

export type SectionPatch = Readonly<Record<string, unknown>>
export type SettingsFileSections = { readonly [K in IntegrationId]?: SectionPatch }

export interface SettingsFile {
  kind: typeof SETTINGS_FILE_KIND
  version: number
  /** ISO date. */
  exportedAt: string
  /** Brand label of the plugin that wrote it, for the review screen. */
  brand?: string
  includesKeys: boolean
  sections: SettingsFileSections
}

export interface ExportOptions {
  sections: readonly IntegrationId[]
  includeKeys: boolean
  brand?: string
  now?: Date
}

/** The chosen sections, minus personal tokens, and minus every shared key unless `includeKeys`. */
export function buildSettingsFile(settings: IntegrationSettings, options: ExportOptions): SettingsFile {
  const sections: Record<string, SectionPatch> = {}
  for (const id of INTEGRATION_IDS) {
    if (!options.sections.includes(id)) continue
    const values = settings[id] as Record<string, unknown>
    const entries = Object.entries(values)
      .filter(([key]) => !isPersonal(id, key) && !signedInToken(values, key) && (options.includeKeys || !isSharedSecret(id, key)))
    sections[id] = Object.fromEntries(entries)
  }
  return {
    kind: SETTINGS_FILE_KIND,
    version: SETTINGS_FILE_VERSION,
    exportedAt: (options.now ?? new Date()).toISOString(),
    ...(options.brand ? { brand: options.brand } : {}),
    includesKeys: options.includeKeys,
    sections,
  }
}

export const serializeSettingsFile = (file: SettingsFile): string => `${JSON.stringify(file, null, 2)}\n`

/** bridge-settings.json: the brand keeps two teams' files apart in a downloads folder. */
export function settingsFileName(brandId?: string | null): string {
  const stem = (brandId ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${stem || 'design-studio'}-settings.json`
}

export interface SkippedSection { id: IntegrationId; reason: string }
export interface ParsedSettingsFile {
  exportedAt: string | null
  brand: string | null
  includesKeys: boolean
  /** Sections that passed every check, holding only the fields the file carries. */
  sections: SettingsFileSections
  /** Sections the file has but that can't be used, with the first reason why. */
  skipped: readonly SkippedSection[]
}
export type ParseResult = { ok: true; file: ParsedSettingsFile } | { ok: false; message: string }

export const NOT_A_SETTINGS_FILE = 'It isn’t a settings file exported from Design Studio, so nothing was changed.'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** A file never carries the Dual File token: the person adds their own after importing. */
const isMissingPersonalKey = (id: IntegrationId, field: string, values: Record<string, unknown>): boolean =>
  id === 'dualFile' && field === 'token' && values.token === ''

/** Field errors that should stop a section from being stored. */
export function blockingErrors<K extends IntegrationId>(id: K, values: IntegrationValues<K>): string[] {
  const bag = values as unknown as Record<string, unknown>
  return Object.entries(validateIntegration(id, values)).filter(([field]) => !isMissingPersonalKey(id, field, bag)).map(([, message]) => message ?? '')
}

function readSection(id: IntegrationId, input: unknown): { patch: SectionPatch } | { reason: string } {
  // Files exported before one token + named files list File 1 / File 2, and before one repository
  // per MCP scenario a single repository; read them the new way.
  const raw = id === 'dualFile' ? migrateDualFile(input) : id === 'mcp' ? migrateMcp(input) : input
  if (!isRecord(raw)) return { reason: 'This section isn’t in a readable shape.' }
  const known = Object.keys(DEFAULT_INTEGRATIONS[id]).filter((key) => Object.prototype.hasOwnProperty.call(raw, key) && !isPersonal(id, key))
  const picked: Record<string, unknown> = Object.fromEntries(known.map((key) => [key, raw[key]]))
  const candidate = { ...DEFAULT_INTEGRATIONS[id], ...picked, ...Object.fromEntries((PERSONAL_FIELDS[id] ?? []).map((key) => [key, ''])) }
  const parsed = z.safeParse(sectionSchemas[id], candidate)
  if (!parsed.success) return { reason: 'Some values are missing or too long.' }
  const first = blockingErrors(id, parsed.data as IntegrationValues<typeof id>)[0]
  if (first) return { reason: first }
  const data = parsed.data as Record<string, unknown>
  return { patch: Object.fromEntries(known.map((key) => [key, data[key]])) }
}

/** Checks an already-parsed JSON value. Unknown sections and unknown fields are dropped. */
export function parseSettingsObject(value: unknown): ParseResult {
  if (!isRecord(value) || value.kind !== SETTINGS_FILE_KIND || !isRecord(value.sections)) return { ok: false, message: NOT_A_SETTINGS_FILE }
  if (typeof value.version !== 'number' || value.version > SETTINGS_FILE_VERSION) return { ok: false, message: 'This file was exported by a newer version of the plugin. Update the plugin, then import it again.' }
  const sections: Record<string, SectionPatch> = {}
  const skipped: SkippedSection[] = []
  for (const id of INTEGRATION_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value.sections, id)) continue
    const result = readSection(id, value.sections[id])
    if ('patch' in result) { if (Object.keys(result.patch).length > 0) sections[id] = result.patch } else skipped.push({ id, reason: result.reason })
  }
  if (Object.keys(sections).length === 0 && skipped.length === 0) return { ok: false, message: 'The file has no settings in it, so nothing was changed.' }
  return {
    ok: true,
    file: {
      exportedAt: typeof value.exportedAt === 'string' && !Number.isNaN(Date.parse(value.exportedAt)) ? value.exportedAt : null,
      brand: typeof value.brand === 'string' ? value.brand.slice(0, 80) : null,
      includesKeys: value.includesKeys === true,
      sections,
      skipped,
    },
  }
}

export function parseSettingsFile(text: string): ParseResult {
  if (text.length > MAX_SETTINGS_FILE_BYTES) return { ok: false, message: 'The file is too large to be a settings file, so nothing was changed.' }
  let value: unknown
  try { value = JSON.parse(text) } catch { return { ok: false, message: 'The file isn’t valid JSON, so nothing was changed.' } }
  return parseSettingsObject(value)
}

/** A list counts as empty when none of its rows has an ID (Dual File starts with one blank file). */
const isEmpty = (value: unknown, fallback: unknown): boolean => {
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.every((row) => !isRecord(row) || typeof row.id !== 'string' || row.id.trim() === '')
  return value === fallback
}

export interface ApplyOptions {
  /** The file only fills fields that are empty (or still on their default). */
  keepExisting: boolean
  /** Fields the brand manages, per section: the file never changes them. */
  locked?: { readonly [K in IntegrationId]?: readonly string[] }
}

/** The person's settings with the file's sections laid over them. Sections not in the file are untouched. */
export function applySettingsFile(current: IntegrationSettings, sections: SettingsFileSections, options: ApplyOptions): IntegrationSettings {
  const out = { ...current } as Record<IntegrationId, Record<string, unknown>>
  for (const id of INTEGRATION_IDS) {
    const patch = sections[id]
    if (!patch) continue
    const mine = current[id] as Record<string, unknown>
    const defaults = DEFAULT_INTEGRATIONS[id] as Record<string, unknown>
    const next = { ...mine }
    for (const [key, value] of Object.entries(patch)) {
      if (isPersonal(id, key) || options.locked?.[id]?.includes(key)) continue
      if (options.keepExisting && !isEmpty(mine[key], defaults[key])) continue
      next[key] = value
    }
    out[id] = next
  }
  return out as unknown as IntegrationSettings
}
