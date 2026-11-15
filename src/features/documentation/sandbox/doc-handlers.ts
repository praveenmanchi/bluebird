// The Documentation handlers, with everything that touches Figma, storage, the
// network or the clock passed in. handler.ts wires the real ones; tests pass fakes.
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import type { IntegrationValues } from '@shared/integrations'
import type { HttpFetch } from '@shared/jira/http'
import { jiraConnection, postComment, searchOpenTickets } from '@shared/jira/tickets'
import {
  MSG, auditRequestSchema, generateRequestSchema, handoffRequestSchema, locateRequestSchema, postRequestSchema,
  type PagesResult, type Progress, type SelectionResult, type TicketsResult,
} from '../messages'
import { buildAudit, buildHandoff, componentsByTier, docChanges, fingerprint, plural } from '../model'
import type { AuditResult, ComponentDoc, HandoffResult, PageInfo, PageScan, ProgressStep, SectionId } from '../types'
import type { DocBlock, DocPage } from './canvas'
import type { RawComponent } from './collect-component'

/** The Figma page component docs are drawn on. */
export const DOCS_PAGE = 'Documentation'

export interface DocumentationDeps {
  /** The selected component, read in full; null when the selection is not one. */
  readSelection: (withPreview: boolean) => Promise<RawComponent | null>
  readComponent: (nodeId: string) => Promise<RawComponent | null>
  /** The doc stored on a component (document plugin data). */
  stored: { get: (nodeId: string) => Promise<string>; set: (nodeId: string, value: string) => Promise<void> }
  listPages: () => Promise<PageInfo[]>
  scanPages: (pageIds: readonly string[]) => Promise<PageScan[]>
  draw: (page: DocPage) => Promise<string>
  locate: (nodeId: string) => Promise<void>
  readJira: () => Promise<IntegrationValues<'jira'>>
  fetch: HttpFetch
  version: string
  now: () => Date
  user: () => string
}

function parseStored(raw: string): ComponentDoc | null {
  if (!raw) return null
  try {
    const doc = JSON.parse(raw) as ComponentDoc
    return typeof doc?.fingerprint === 'string' && Array.isArray(doc.tokens) && Array.isArray(doc.properties) ? doc : null
  } catch {
    // Plugin data another version wrote, or a hand-edited value: treat the component as not documented.
    return null
  }
}

/** Emits the step list with everything before `current` done. */
function reporter(ctx: HandlerContext, labels: readonly string[]) {
  return (current: number, done: readonly string[] = []) => {
    const steps: ProgressStep[] = labels.map((label, i) => ({ label: i < current ? done[i] ?? label : label, status: i < current ? 'done' : i === current ? 'running' : 'queued' }))
    ctx.emit(MSG.progress, { steps } satisfies Progress)
  }
}

function componentPage(doc: ComponentDoc): DocPage {
  const has = (id: SectionId) => doc.sections.includes(id)
  const blocks: DocBlock[] = []
  if (has('anatomy')) blocks.push({ heading: 'Anatomy', rows: doc.anatomy.map((p) => [`${p.n}. ${p.name}`, p.detail]) })
  if (has('properties')) blocks.push({ heading: 'Properties and variants', rows: doc.properties.map((p) => [p.name, p.value]) })
  if (has('tokens')) blocks.push({ heading: 'Tokens used', head: ['Token', 'Used for', 'Points at', 'Value'], rows: doc.tokens.map((t) => [t.name, `${t.role} · ${t.layer}`, t.alias ?? '—', t.value]) })
  if (has('brands') && doc.brandDiff) blocks.push({ heading: `Brand differences · ${doc.brandDiff.token}`, rows: doc.brandDiff.values.map((v) => [v.brand, v.value]) })
  if (has('a11y')) blocks.push({ heading: 'Accessibility', rows: doc.checks.map((c) => [c.title, c.detail]) })
  if (has('code') && doc.code) blocks.push({ heading: 'Code', prose: true, rows: doc.code.split('\n').map((l) => [l]) })
  return {
    pageName: DOCS_PAGE, frameName: `Doc · ${doc.name}`, title: doc.name,
    meta: `${doc.kind} · ${plural(doc.variants, 'variant')} · generated ${doc.generatedAt.slice(0, 10)} · Bluebird ${doc.version}`, blocks,
  }
}

function handoffPage(result: Omit<HandoffResult, 'frameId'>, pages: readonly PageScan[], intent: string, author: string, known: ReadonlyArray<readonly string[]>): DocPage {
  const blocks: DocBlock[] = [{ heading: 'Summary', prose: true, rows: [[intent.trim() || 'Draft: say what this hand-off is for.']] }, { heading: 'What’s in it', rows: result.facts }]
  if (result.sections.some((s) => s.title === 'Screens')) {
    blocks.push({ heading: 'Screens', head: ['Screen', 'Page', 'Prototype'], rows: pages.flatMap((p) => p.screens.map((s) => [s.name, p.name, s.linked ? 'Linked' : 'Not linked'])) })
  }
  if (result.sections.some((s) => s.title === 'Components')) blocks.push({ heading: 'Components used', rows: componentsByTier(pages).map((t) => [t.tier.charAt(0).toUpperCase() + t.tier.slice(1), t.names.join(', ')]) })
  if (result.sections.some((s) => s.title === 'Known issues')) blocks.push({ heading: 'Known issues', head: ['Issue', 'Where', 'Suggested fix'], rows: known })
  return {
    pageName: result.title, frameName: `${result.title} · ${result.version}`, title: result.title,
    meta: `${result.version} · created ${result.createdAt.slice(0, 10)} · by ${author}${result.ticket ? ` · ${result.ticket}` : ''}`, blocks,
  }
}

export function createDocumentationHandlers(deps: DocumentationDeps): HandlerMap {
  /** The last audit's scan: Create hand-off builds from what the designer reviewed, not a second read. */
  let lastScan: { key: string; pages: PageScan[]; audit: AuditResult } | null = null

  async function selection(): Promise<SelectionResult> {
    const raw = await deps.readSelection(true)
    if (!raw) return { status: 'none' }
    const doc = parseStored(await deps.stored.get(raw.summary.nodeId))
    const changes = doc ? docChanges(doc, { variants: raw.summary.variants, properties: raw.properties, tokens: raw.tokens }) : []
    return { status: 'component', component: raw.summary, doc: doc ? { ...doc, preview: raw.summary.preview } : null, changes }
  }

  async function generate(payload: unknown, ctx: HandlerContext): Promise<ComponentDoc> {
    const req = generateRequestSchema.parse(payload)
    const report = reporter(ctx, ['Reading variants and properties', 'Resolving tokens across brands', 'Measuring contrast and target size', 'Drawing the doc frame'].slice(0, req.frame ? 4 : 3))
    report(0)
    const raw = await deps.readComponent(req.nodeId)
    if (!raw) throw new Error('That component is no longer in this file. Select it again.')
    const s = raw.summary
    const done = [`Read ${plural(s.variants, 'variant')} and ${plural(s.properties.length, 'property', 'properties')}`, `Resolved ${plural(s.tokens, 'token')} in ${plural(Math.max(1, s.brands.length), 'brand')}`, 'Measured contrast and target size']
    report(2, done)
    const base: ComponentDoc = {
      nodeId: s.nodeId, name: s.name, kind: s.kind, variants: s.variants, generatedAt: deps.now().toISOString(), version: deps.version, brands: s.brands,
      sections: req.sections, preview: null, anatomy: raw.anatomy, properties: raw.properties, tokens: raw.tokens, brandDiff: raw.brandDiff, checks: raw.checks,
      code: raw.code, fingerprint: fingerprint({ variants: s.variants, properties: raw.properties, tokens: raw.tokens }), frameId: null,
    }
    let frameId: string | null = null
    if (req.frame) {
      report(3, done)
      frameId = await deps.draw(componentPage(base))
    }
    const doc = { ...base, frameId }
    // The preview is not stored: it is re-exported on the next visit, and plugin data is capped at 100 kB.
    await deps.stored.set(s.nodeId, JSON.stringify(doc))
    return { ...doc, preview: s.preview }
  }

  async function audit(payload: unknown): Promise<AuditResult> {
    const { pageIds } = auditRequestSchema.parse(payload)
    const pages = await deps.scanPages(pageIds)
    if (!pages.length) throw new Error('Those pages are no longer in this file. Pick them again.')
    const result = buildAudit(pages)
    lastScan = { key: pageIds.join(','), pages, audit: result }
    return result
  }

  async function handoff(payload: unknown, ctx: HandlerContext): Promise<HandoffResult> {
    const req = handoffRequestSchema.parse(payload)
    const report = reporter(ctx, ['Reading the prototype', 'Listing screens', 'Grouping components', 'Listing known issues', 'Drawing the hand-off page'])
    report(0)
    const scan = lastScan?.key === req.pageIds.join(',') ? lastScan : null
    const pages = scan?.pages ?? await deps.scanPages(req.pageIds)
    if (!pages.length) throw new Error('Those pages are no longer in this file. Pick them again.')
    const findings = (scan?.audit ?? buildAudit(pages)).findings
    const result = buildHandoff({ pages, findings, ignored: req.ignored, include: req.include, ticket: req.ticket, intent: req.intent, audience: req.audience, version: req.version, createdAt: deps.now().toISOString() })
    report(4, [`Read ${plural(pages.reduce((n, p) => n + p.flows, 0), 'prototype flow')}`, `Listed ${plural(pages.reduce((n, p) => n + p.screens.length, 0), 'screen')}`, `Grouped ${plural(componentsByTier(pages).reduce((n, t) => n + t.names.length, 0), 'component')}`, `Listed ${plural(req.ignored.length, 'known issue')}`])
    const known = findings.filter((f) => req.ignored.includes(f.id)).map((f) => [f.title, f.meta, f.fix.replace(/^Fix: /, '')] as const)
    const frameId = await deps.draw(handoffPage(result, pages, req.intent, deps.user(), known))
    return { ...result, frameId }
  }

  async function tickets(): Promise<TicketsResult> {
    const connection = jiraConnection(await deps.readJira())
    if ('problem' in connection) return { connected: false, problem: connection.problem }
    const open = await searchOpenTickets(connection.config, deps.fetch)
    return { connected: true, tickets: open.map((t) => ({ key: t.key, summary: t.title, status: t.status })) }
  }

  async function post(payload: unknown): Promise<{ key: string }> {
    const req = postRequestSchema.parse(payload)
    const connection = jiraConnection(await deps.readJira())
    if ('problem' in connection) throw new Error(connection.problem)
    await postComment(connection.config, deps.fetch, req.key, req.text)
    return { key: req.key }
  }

  return {
    [MSG.selection]: async () => selection(),
    [MSG.generate]: async (payload: unknown, ctx: HandlerContext) => generate(payload, ctx),
    [MSG.pages]: async (): Promise<PagesResult> => ({ pages: await deps.listPages() }),
    [MSG.audit]: async (payload: unknown) => audit(payload),
    [MSG.handoff]: async (payload: unknown, ctx: HandlerContext) => handoff(payload, ctx),
    [MSG.tickets]: async () => tickets(),
    [MSG.post]: async (payload: unknown) => post(payload),
    [MSG.locate]: async (payload: unknown) => { await deps.locate(locateRequestSchema.parse(payload).nodeId) },
  }
}
