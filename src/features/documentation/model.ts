// Pure rules of the Documentation tab: no Figma, no network. The sandbox and the
// mock both build their answers through these, so the two cannot drift apart.
import type {
  AuditLine, AuditResult, ComponentDoc, DocProperty, DocToken, Finding, FindingCategory, HandoffResult, HandoffSection, IncludeId, PageScan,
  ScreenScan, Tier,
} from './types'

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

// ── Components ────────────────────────────────────────────────────────────────

/** What a doc was built from. Two docs with the same facts are the same doc. */
export interface DocFacts { variants: number; properties: readonly DocProperty[]; tokens: readonly DocToken[] }

/** FNV-1a over the facts: short, stable, and enough to tell "changed since". */
export function fingerprint(facts: DocFacts): string {
  const text = JSON.stringify([facts.variants, facts.properties.map((p) => [p.name, p.value]), facts.tokens.map((t) => [t.name, t.role, t.layer, t.value])])
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** What changed on the component since `doc` was generated, one short phrase each. */
export function docChanges(doc: DocFacts & { fingerprint: string }, now: DocFacts): string[] {
  if (doc.fingerprint === fingerprint(now)) return []
  const changes: string[] = []
  if (doc.variants !== now.variants) changes.push(`${plural(now.variants, 'variant')}, was ${doc.variants}`)
  const before = new Map(doc.properties.map((p) => [p.name, p.value]))
  for (const p of now.properties) {
    if (!before.has(p.name)) changes.push(`new property ${p.name}`)
    else if (before.get(p.name) !== p.value) changes.push(`${p.name} is now ${p.value}`)
    before.delete(p.name)
  }
  for (const name of before.keys()) changes.push(`property ${name} removed`)
  const tokenKey = (t: DocToken) => `${t.layer}›${t.role}›${t.name}`
  const old = new Map(doc.tokens.map((t) => [tokenKey(t), t.value]))
  for (const t of now.tokens) {
    const key = tokenKey(t)
    if (!old.has(key)) changes.push(`${t.name} added on ${t.layer}`)
    else if (old.get(key) !== t.value) changes.push(`${t.name} ${old.get(key)} → ${t.value}`)
    old.delete(key)
  }
  for (const key of old.keys()) changes.push(`${key.split('›')[2]} no longer used`)
  return changes.length ? changes : ['the component changed']
}

/** `<Button type="primary" size="medium">Label</Button>` from the default variant. */
export function codeSnippet(name: string, variantProps: Readonly<Record<string, string>>, label: string | null): string {
  const tag = name.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ?? '').toUpperCase()).replace(/^./, (c) => c.toUpperCase()) || 'Component'
  const attrs = Object.entries(variantProps)
    .map(([key, value]) => ` ${key.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ?? '').toUpperCase()).replace(/^./, (c) => c.toLowerCase())}="${value.toLowerCase()}"`)
    .join('')
  return label ? `<${tag}${attrs}>\n  ${label}\n</${tag}>` : `<${tag}${attrs} />`
}

export function docMarkdown(doc: ComponentDoc): string {
  const out: string[] = [`# ${doc.name}`, '', `${doc.kind} · ${plural(doc.variants, 'variant')} · generated ${doc.generatedAt.slice(0, 10)} · Bluebird ${doc.version}`]
  const has = (id: ComponentDoc['sections'][number]) => doc.sections.includes(id)
  if (has('anatomy') && doc.anatomy.length) out.push('', '## Anatomy', '', ...doc.anatomy.map((p) => `${p.n}. **${p.name}** — ${p.detail}`))
  if (has('properties') && doc.properties.length) out.push('', '## Properties and variants', '', '| Property | Values |', '| --- | --- |', ...doc.properties.map((p) => `| ${p.name} | ${p.value} |`))
  if (has('tokens') && doc.tokens.length) {
    out.push('', '## Tokens used', '', '| Token | Used for | Points at | Value |', '| --- | --- | --- | --- |', ...doc.tokens.map((t) => `| \`${t.name}\` | ${t.role} · ${t.layer} | ${t.alias ?? '—'} | ${t.value} |`))
  }
  if (has('brands') && doc.brandDiff) out.push('', `## Brand differences · ${doc.brandDiff.token}`, '', ...doc.brandDiff.values.map((v) => `- ${v.brand}: ${v.value}`))
  if (has('a11y') && doc.checks.length) out.push('', '## Accessibility', '', ...doc.checks.map((c) => `- ${c.status === 'pass' ? 'Pass' : c.status === 'fail' ? 'Fail' : 'Check'} — ${c.title}. ${c.detail}`))
  if (has('code') && doc.code) out.push('', '## Code', '', '```tsx', doc.code, '```')
  return `${out.join('\n')}\n`
}

// ── Hand-off ──────────────────────────────────────────────────────────────────

/** A named frame repeated on this many screens should have been a component. */
export const REPEAT_THRESHOLD = 3
/** Findings listed per category; the pop-up line still counts all of them. */
export const MAX_FINDINGS = 40

const screensOf = (pages: readonly PageScan[]): ScreenScan[] => pages.flatMap((p) => p.screens)

function spacingFindings(screens: readonly ScreenScan[]): Finding[] {
  return screens.flatMap((s) => s.unboundGaps.map((g): Finding => ({
    id: `spacing:${g.id}`, category: 'spacing', severity: 'serious', nodeId: g.id,
    title: `${g.name} gap ${g.gap} is not bound`, meta: `${s.page} · ${s.name}`, fix: `Fix: bind a spacing variable (${g.gap})`,
  })))
}

function repeatFindings(screens: readonly ScreenScan[]): Finding[] {
  const seen = new Map<string, { first: string; screens: Set<string> }>()
  for (const s of screens) {
    for (const f of s.frames) {
      const entry = seen.get(f.name) ?? { first: f.id, screens: new Set<string>() }
      entry.screens.add(s.id)
      seen.set(f.name, entry)
    }
  }
  return [...seen.entries()]
    .filter(([, e]) => e.screens.size >= REPEAT_THRESHOLD)
    .sort((a, b) => b[1].screens.size - a[1].screens.size)
    .map(([name, e]): Finding => ({
      id: `components:${name}`, category: 'components', severity: 'moderate', nodeId: e.first,
      title: `${name} is a one-off frame on ${plural(e.screens.size, 'screen')}`, meta: 'Same name each time', fix: 'Fix: build it once as a component',
    }))
}

function nameFindings(screens: readonly ScreenScan[]): Finding[] {
  return screens.filter((s) => s.defaultNamed.length).map((s): Finding => ({
    id: `names:${s.id}`, category: 'names', severity: 'minor', nodeId: s.defaultNamed[0]!.id,
    title: `${plural(s.defaultNamed.length, 'layer')} still named “${s.defaultNamed[0]!.name}”${s.defaultNamed.length > 1 ? '…' : ''}`,
    meta: `${s.page} · ${s.name}`, fix: 'Fix: rename them so Dev Mode shows meaningful names',
  }))
}

function prototypeFindings(pages: readonly PageScan[]): Finding[] {
  // A page with no links at all is not "some screens missing": the hand-off falls back to canvas order.
  return pages.filter((p) => p.links > 0).flatMap((p) => p.screens.filter((s) => !s.linked).map((s): Finding => ({
    id: `prototype:${s.id}`, category: 'prototype', severity: 'moderate', nodeId: s.id,
    title: `${s.name} isn’t in the prototype`, meta: `${p.name} · no link in or out`, fix: 'Fix: link it in Prototype mode',
  })))
}

function valueFindings(screens: readonly ScreenScan[]): Finding[] {
  return screens.filter((s) => s.rawColors + s.rawTextSizes > 0).map((s): Finding => ({
    id: `values:${s.id}`, category: 'values', severity: 'serious', nodeId: s.id,
    title: `${s.name} has ${plural(s.rawColors, 'raw colour')} and ${plural(s.rawTextSizes, 'raw text size')}`,
    meta: s.page, fix: 'Fix: bind colour variables and text styles',
  }))
}

function line(category: FindingCategory, found: readonly Finding[], all: readonly ScreenScan[], pages: readonly PageScan[]): AuditLine {
  const n = found.length
  switch (category) {
    case 'spacing':
      return n ? { category, status: 'fail', title: `${plural(n, 'hard-coded spacing value')}`, detail: `On ${plural(new Set(found.map((f) => f.meta)).size, 'screen')} · bind a spacing variable` }
        : { category, status: 'pass', title: 'Spacing is bound to variables', detail: `0 unbound gaps in ${plural(all.length, 'screen')}` }
    case 'components':
      return n ? { category, status: 'warning', title: `${plural(n, 'repeated frame')} ${n === 1 ? 'isn’t a component' : 'aren’t components'}`, detail: found.slice(0, 3).map((f) => f.title.split(' is a ')[0]).join(', ') }
        : { category, status: 'pass', title: 'Repeated layouts are components', detail: `No frame name repeats on ${REPEAT_THRESHOLD} or more screens` }
    case 'names': {
      const layers = all.reduce((sum, s) => sum + s.defaultNamed.length, 0)
      return n ? { category, status: 'warning', title: `${plural(layers, 'layer')} still named “${all.find((s) => s.defaultNamed.length)!.defaultNamed[0]!.name}”…`, detail: 'Rename them so Dev Mode shows meaningful names' }
        : { category, status: 'pass', title: 'Layers are named', detail: 'No default Frame, Group or Rectangle names' }
    }
    case 'prototype': {
      if (n) return { category, status: 'warning', title: `${plural(n, 'screen')} ${n === 1 ? 'isn’t' : 'aren’t'} in the prototype`, detail: found.slice(0, 3).map((f) => f.title.split(' isn’t ')[0]).join(', ') }
      const unlinked = pages.filter((p) => p.links === 0)
      return unlinked.length
        ? { category, status: 'warning', title: `${unlinked.map((p) => p.name).join(', ')} ${unlinked.length === 1 ? 'has' : 'have'} no prototype links`, detail: 'Screens are laid out in canvas order instead' }
        : { category, status: 'pass', title: 'Every screen is in the prototype', detail: `${plural(pages.reduce((s, p) => s + p.links, 0), 'link')} read` }
    }
    case 'values': {
      const colors = all.reduce((s, x) => s + x.rawColors, 0), sizes = all.reduce((s, x) => s + x.rawTextSizes, 0)
      return n ? { category, status: 'fail', title: 'Some colours and type are hard-coded', detail: `${plural(colors, 'raw colour')}, ${plural(sizes, 'raw text size')} on ${plural(n, 'screen')}` }
        : { category, status: 'pass', title: 'Colours and type are bound to variables', detail: `0 raw colours, 0 raw text sizes in ${plural(all.length, 'screen')}` }
    }
  }
}

const ORDER: readonly FindingCategory[] = ['spacing', 'components', 'names', 'prototype', 'values']

/** The pop-up lines and the reviewable findings for the picked pages. */
export function buildAudit(pages: readonly PageScan[]): AuditResult {
  const all = screensOf(pages)
  const byCategory: Record<FindingCategory, Finding[]> = {
    spacing: spacingFindings(all), components: repeatFindings(all), names: nameFindings(all), prototype: prototypeFindings(pages), values: valueFindings(all),
  }
  const status = { fail: 0, warning: 1, pass: 2 } as const
  const lines = ORDER.map((c) => line(c, byCategory[c], all, pages)).sort((a, b) => status[a.status] - status[b.status])
  return {
    pages: pages.map((p) => p.name),
    screens: all.length,
    flows: pages.reduce((s, p) => s + p.flows, 0),
    links: pages.reduce((s, p) => s + p.links, 0),
    lines,
    findings: ORDER.flatMap((c) => byCategory[c].slice(0, MAX_FINDINGS)),
  }
}

const TIER_LABEL: Readonly<Record<Tier, readonly [string, string]>> = {
  atoms: ['atom', 'atoms'], molecules: ['molecule', 'molecules'], organisms: ['organism', 'organisms'], icons: ['icon', 'icons'], other: ['other component', 'other components'],
}

/** Distinct components used on the screens, by tier. */
export function componentsByTier(pages: readonly PageScan[]): Array<{ tier: Tier; names: string[] }> {
  const tiers = new Map<Tier, Set<string>>()
  for (const s of screensOf(pages)) for (const c of s.components) tiers.set(c.tier, (tiers.get(c.tier) ?? new Set()).add(c.name))
  return (Object.keys(TIER_LABEL) as Tier[]).filter((t) => tiers.has(t)).map((tier) => ({ tier, names: [...tiers.get(tier)!].sort() }))
}

export interface HandoffInput {
  pages: readonly PageScan[]
  findings: readonly Finding[]
  ignored: readonly string[]
  include: readonly IncludeId[]
  ticket: { key: string; summary: string } | null
  intent: string
  audience: string
  version: string
  createdAt: string
}

export const handoffTitle = (pages: readonly PageScan[]): string => `Handoff · ${pages.map((p) => p.name.replace(/^[\s↳]+/, '')).join(' + ')}`

/** Everything the Result screen and the canvas page say, minus the frame id. */
export function buildHandoff(input: HandoffInput): Omit<HandoffResult, 'frameId'> {
  const all = screensOf(input.pages)
  const flows = input.pages.reduce((s, p) => s + p.flows, 0), links = input.pages.reduce((s, p) => s + p.links, 0)
  const linked = all.filter((s) => s.linked).length
  const tiers = componentsByTier(input.pages)
  const total = tiers.reduce((s, t) => s + t.names.length, 0)
  const known = input.findings.filter((f) => input.ignored.includes(f.id))
  const title = handoffTitle(input.pages)
  const has = (id: IncludeId) => input.include.includes(id)

  const facts: Array<readonly [string, string]> = [
    ['Page', title],
    ['Screens', links ? `${all.length} · ${linked} in the prototype, ${all.length - linked} not linked` : `${all.length} · in canvas order`],
    ['User flow', links ? `${plural(flows, 'flow')} from the prototype, ${plural(links, 'link')}` : 'No prototype links'],
    ['Components', total ? `${total} · ${tiers.map((t) => `${t.names.length} ${TIER_LABEL[t.tier][t.names.length === 1 ? 0 : 1]}`).join(', ')}` : 'None used'],
    ['Known issues', known.length ? `${known.length} ignored, listed for the developers` : 'None'],
    ['Jira', input.ticket ? `${input.ticket.key} · not posted yet` : 'No ticket'],
  ]
  const sections: HandoffSection[] = [{ status: input.intent.trim() ? 'pass' : 'warning', title: 'Cover and summary', detail: input.intent.trim() ? `For the ${input.audience.toLowerCase()} · intent from your note` : 'No note yet · add what this hand-off is for on the canvas' }]
  if (has('flow')) sections.push(links ? { status: 'pass', title: 'User flow', detail: `${plural(flows, 'flow')} and ${plural(links, 'link')} from the prototype` } : { status: 'warning', title: 'User flow', detail: 'No prototype links · screens listed in canvas order' })
  if (has('screens')) sections.push({ status: 'pass', title: 'Screens', detail: `${plural(all.length, 'screen')} from ${plural(input.pages.length, 'page')}` })
  if (has('components')) sections.push({ status: 'pass', title: 'Components', detail: total ? tiers.map((t) => `${t.names.length} ${TIER_LABEL[t.tier][t.names.length === 1 ? 0 : 1]}`).join(', ') : 'No component instances on these screens' })
  if (has('issues')) sections.push({ status: known.length ? 'warning' : 'pass', title: 'Known issues', detail: known.length ? `${plural(known.length, 'issue')} you ignored` : 'Nothing ignored' })

  const summary = [
    `${title} — ${input.version}`,
    input.intent.trim(),
    `Screens: ${facts[1]![1]}`,
    `User flow: ${facts[2]![1]}`,
    `Components: ${facts[3]![1]}`,
    known.length ? `Known issues:\n${known.map((f) => `- ${f.title} (${f.meta})`).join('\n')}` : 'Known issues: none',
  ].filter(Boolean).join('\n\n')

  return { title, version: input.version, createdAt: input.createdAt, facts, sections, ticket: input.ticket?.key ?? null, summary }
}
