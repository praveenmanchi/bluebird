import { describe, it, expect } from 'vitest'
import { BUTTON, BUTTON_CHANGED, SCANS } from '../fixtures'
import { buildAudit, buildHandoff, codeSnippet, componentsByTier, docChanges, docMarkdown, fingerprint, handoffTitle, plural } from '../model'
import type { ComponentDoc, PageScan } from '../types'

const facts = (raw: typeof BUTTON) => ({ variants: raw.summary.variants, properties: raw.properties, tokens: raw.tokens })

const doc: ComponentDoc = {
  nodeId: '1:2', name: 'Button', kind: 'Component set', variants: 12, generatedAt: '2026-11-15T10:00:00.000Z', version: 'V1.3.36', brands: ['Bridge', 'Ikea'],
  sections: ['anatomy', 'properties', 'tokens', 'brands', 'a11y', 'code'], preview: null, anatomy: BUTTON.anatomy, properties: BUTTON.properties, tokens: BUTTON.tokens,
  brandDiff: BUTTON.brandDiff, checks: BUTTON.checks, code: BUTTON.code, fingerprint: fingerprint(facts(BUTTON)), frameId: null,
}

describe('component docs', () => {
  it('pluralises', () => {
    expect(plural(1, 'screen')).toBe('1 screen')
    expect(plural(2, 'property', 'properties')).toBe('2 properties')
  })

  it('gives the same fingerprint for the same facts and a new one when a value moves', () => {
    expect(fingerprint(facts(BUTTON))).toBe(fingerprint(facts({ ...BUTTON })))
    expect(fingerprint(facts(BUTTON))).not.toBe(fingerprint(facts(BUTTON_CHANGED)))
    expect(fingerprint(facts(BUTTON))).toMatch(/^[0-9a-f]{8}$/)
  })

  it('reports nothing when the component is unchanged', () => {
    expect(docChanges(doc, facts(BUTTON))).toEqual([])
  })

  it('names the variant, property and token changes', () => {
    expect(docChanges(doc, facts(BUTTON_CHANGED))).toEqual(['18 variants, was 12', 'Size is now Small · Medium · Large', 'button/primary/radius 6 → 8'])
  })

  it('names added and removed properties and tokens', () => {
    const now = { variants: 12, properties: [...BUTTON.properties.slice(1), { name: 'Loading', value: 'Boolean · off by default' }], tokens: [...BUTTON.tokens.slice(1), { ...BUTTON.tokens[0]!, name: 'button/primary/border', role: 'Stroke' }] }
    expect(docChanges(doc, now)).toEqual(['new property Loading', 'property Type removed', 'button/primary/border added on Container', 'button/primary/bg/default no longer used'])
  })

  it('falls back to a general line when only the hash differs', () => {
    expect(docChanges({ ...doc, fingerprint: 'deadbeef' }, facts(BUTTON))).toEqual(['the component changed'])
  })

  it('writes a code snippet from the variant properties', () => {
    expect(codeSnippet('Button', { Type: 'Primary', 'Icon only': 'False' }, 'Save')).toBe('<Button type="primary" iconOnly="false">\n  Save\n</Button>')
    expect(codeSnippet('ticket row', {}, null)).toBe('<TicketRow />')
    expect(codeSnippet('—', {}, null)).toBe('<Component />')
  })

  it('writes Markdown for the chosen sections only', () => {
    const all = docMarkdown(doc)
    expect(all).toContain('# Button')
    expect(all).toContain('| `button/primary/bg/default` | Fill · Container | surface/accent | #0978C8 |')
    expect(all).toContain('## Brand differences · button/primary/bg/default')
    expect(all).toContain('- Fail — Contrast 1.4.3 · fails at 3.5:1.')
    expect(all).toContain('```tsx')
    const some = docMarkdown({ ...doc, sections: ['properties'] })
    expect(some).toContain('## Properties and variants')
    expect(some).not.toContain('## Anatomy')
    expect(some).not.toContain('## Code')
  })
})

describe('hand-off audit', () => {
  const publish = [SCANS['p:publish']!]

  it('finds unbound gaps, repeated frames, default names and unlinked screens on Publish', () => {
    const audit = buildAudit(publish)
    expect(audit).toMatchObject({ pages: ['Publish'], screens: 14, flows: 6, links: 21 })
    const count = (c: string) => audit.findings.filter((f) => f.category === c).length
    expect(count('spacing')).toBe(3)
    expect(count('components')).toBe(2)
    expect(count('names')).toBe(2)
    expect(count('prototype')).toBe(1)
    expect(count('values')).toBe(0)
    expect(audit.findings.find((f) => f.category === 'components')!.title).toBe('Actions bar is a one-off frame on 14 screens')
    expect(audit.findings.find((f) => f.category === 'prototype')!.title).toBe('Publish · Empty file isn’t in the prototype')
  })

  it('orders the pop-up lines fail, warning, pass', () => {
    const lines = buildAudit(publish).lines
    expect(lines.map((l) => l.status)).toEqual(['fail', 'warning', 'warning', 'warning', 'pass'])
    expect(lines[0]!.title).toBe('3 hard-coded spacing values')
    expect(lines[4]!.title).toBe('Colours and type are bound to variables')
    expect(lines.find((l) => l.category === 'names')!.title).toBe('4 layers still named “Frame 1430102627”…')
  })

  it('passes a clean page and says so per line', () => {
    const clean: PageScan = { ...SCANS['p:mcp']!, screens: SCANS['p:mcp']!.screens.map((s) => ({ ...s, linked: true })) }
    const audit = buildAudit([clean])
    expect(audit.findings).toEqual([])
    expect(audit.lines.every((l) => l.status === 'pass')).toBe(true)
  })

  it('warns instead of listing every screen when a page has no prototype at all', () => {
    const audit = buildAudit([SCANS['p:jira']!])
    expect(audit.links).toBe(0)
    expect(audit.findings.filter((f) => f.category === 'prototype')).toEqual([])
    expect(audit.lines.find((l) => l.category === 'prototype')).toMatchObject({ status: 'warning', title: 'Jira has no prototype links' })
  })

  it('flags raw colours and text sizes', () => {
    const raw: PageScan = { ...SCANS['p:jira']!, screens: [{ ...SCANS['p:jira']!.screens[0]!, rawColors: 2, rawTextSizes: 1 }] }
    const audit = buildAudit([raw])
    expect(audit.findings[0]).toMatchObject({ category: 'values', title: 'Jira · Extract has 2 raw colours and 1 raw text size' })
    expect(audit.lines[0]).toMatchObject({ status: 'fail', detail: '2 raw colours, 1 raw text size on 1 screen' })
  })
})

describe('hand-off result', () => {
  const pages = [SCANS['p:publish']!]
  const findings = buildAudit(pages).findings
  const base = { pages, findings, ignored: findings.map((f) => f.id), include: ['flow', 'screens', 'components', 'issues'] as const, ticket: { key: 'BB-210', summary: 'Publish flow v2' }, intent: 'Ship the v2 flow.', audience: 'Development team', version: 'Draft v0.1', createdAt: '2026-11-15T10:00:00.000Z' }

  it('groups the components used by tier', () => {
    expect(componentsByTier(pages)).toEqual([{ tier: 'atoms', names: ['Button'] }, { tier: 'molecules', names: ['Change Row'] }, { tier: 'organisms', names: ['Pipeline'] }])
  })

  it('names the page after the picked pages', () => {
    expect(handoffTitle([{ ...pages[0]!, name: '  ↳ Publish' }, SCANS['p:mcp']!])).toBe('Handoff · Publish + MCP')
  })

  it('states the facts, sections and the Jira summary', () => {
    const result = buildHandoff(base)
    expect(result.title).toBe('Handoff · Publish')
    expect(Object.fromEntries(result.facts)).toMatchObject({
      Screens: '14 · 13 in the prototype, 1 not linked',
      'User flow': '6 flows from the prototype, 21 links',
      Components: '3 · 1 atom, 1 molecule, 1 organism',
      'Known issues': '8 ignored, listed for the developers',
      Jira: 'BB-210 · not posted yet',
    })
    expect(result.sections.map((s) => [s.title, s.status])).toEqual([['Cover and summary', 'pass'], ['User flow', 'pass'], ['Screens', 'pass'], ['Components', 'pass'], ['Known issues', 'warning']])
    expect(result.summary).toContain('Handoff · Publish — Draft v0.1')
    expect(result.summary).toContain('- Extract row gap 8 is not bound (Publish · Publish · Extract)')
    expect(result.ticket).toBe('BB-210')
  })

  it('handles no ticket, no note, no prototype and nothing ignored', () => {
    const result = buildHandoff({ ...base, pages: [SCANS['p:settings']!], findings: [], ignored: [], ticket: null, intent: ' ', include: ['flow', 'issues'] })
    expect(Object.fromEntries(result.facts)).toMatchObject({ Screens: '3 · in canvas order', 'User flow': 'No prototype links', 'Known issues': 'None', Jira: 'No ticket' })
    expect(result.sections.map((s) => [s.title, s.status])).toEqual([['Cover and summary', 'warning'], ['User flow', 'warning'], ['Known issues', 'pass']])
    expect(result.summary).toContain('Known issues: none')
    expect(result.ticket).toBeNull()
  })
})
