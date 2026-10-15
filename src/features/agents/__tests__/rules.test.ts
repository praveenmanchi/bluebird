import { describe, it, expect, beforeEach } from 'vitest'
import { accessibilityFindings, type BrandModeColors } from '../rules/accessibility'
import { contentFindings, placeholderTexts } from '../rules/content'
import { designSystemFindings } from '../rules/design-system'
import { estimateWidth, expansion, localizationFindings, LOCALES, overflowRisk } from '../rules/localization'
import { groupFindings, nearestColor, nearestPassing, resetFindingIds, score, type RuleContext } from '../rules/shared'
import { batches, parseReview, reviewFindings, reviewItems, systemPromptFor } from '../rules/text-review'
import type { Inventory, NodeInfo, TextInfo } from '../sandbox/inventory'

const ctx: RuleContext = { rules: new Set(), mode: 'suggest' }
const rgb = (r: number, g: number, b: number) => ({ r, g, b })
const WHITE = rgb(1, 1, 1)

const text = (patch: Partial<TextInfo>): TextInfo => ({
  id: 't1', name: 'Label', path: 'Checkout › Pay button › Label', characters: 'Pay now', fontFamily: 'Inter', fontSize: 14, fontWeight: 400,
  width: 200, height: 20, autoResize: 'WIDTH_AND_HEIGHT', truncates: false, maxLines: null, styled: true, inInstance: false, role: 'button',
  runs: [{ characters: 'Pay now', fontSize: 14, fontWeight: 400, fontStyle: 'Regular', fill: { hex: '#777777', rgb: rgb(0.47, 0.47, 0.47), alpha: 1 } }],
  backdrop: { rgb: WHITE, hex: '#ffffff', assumed: false }, opacity: 1, ...patch,
})
const node = (patch: Partial<NodeInfo>): NodeInfo => ({
  id: 'n1', name: 'Card', type: 'FRAME', path: 'Checkout › Card', width: 200, height: 100, fills: [], stroke: null, strokeWeight: 0, hasImageFill: false,
  isInstance: false, interactive: false, backdrop: { rgb: WHITE, hex: '#ffffff' }, inInstance: false, childrenCount: 2, ...patch,
})
const inventory = (texts: TextInfo[] = [], nodes: NodeInfo[] = []): Inventory => ({ pageName: 'Page', fileName: 'File', scopeName: 'Checkout', frames: 1, texts, nodes, truncated: false, layers: texts.length + nodes.length })

beforeEach(() => resetFindingIds())

describe('accessibility rules', () => {
  it('flags text under 4.5:1 with the nearest passing token, in every brand mode', () => {
    const palette = [{ id: 'v-dark', name: 'text/primary', rgb: rgb(0.1, 0.1, 0.1), scopes: ['TEXT_FILL'] }, { id: 'v-mid', name: 'text/muted', rgb: rgb(0.45, 0.45, 0.45), scopes: ['TEXT_FILL'] }]
    const brand: BrandModeColors = {
      modes: ['Bridge', 'Ikea'], activeMode: 'Bridge',
      colorIn: (id, mode) => (id === 'v-fg' ? (mode === 'Ikea' ? rgb(0.9, 0.9, 0.9) : rgb(0.47, 0.47, 0.47)) : null),
      paletteIn: () => palette,
    }
    const t = text({ runs: [{ characters: 'Pay now', fontSize: 14, fontWeight: 400, fontStyle: 'Regular', fill: { hex: '#777777', rgb: rgb(0.47, 0.47, 0.47), alpha: 1, variableId: 'v-fg', variableName: 'text/weak' } }] })
    const { findings, checked } = accessibilityFindings(inventory([t]), ctx, brand)
    expect(checked).toBe(1)
    // Bridge: 4.48:1 fails by a hair → serious; Ikea: #E6E6E6 on white → critical. One row per pair/mode.
    expect(findings.map((f) => [f.rule, f.severity, f.meta])).toEqual([
      ['1.4.3', 'serious', 'WCAG 1.4.3 · Checkout › Pay button › Label'],
      ['1.4.3', 'critical', 'WCAG 1.4.3 · Checkout › Pay button › Label · Ikea mode'],
    ])
    // The nearest passing token, not the darkest: text/muted clears 4.5:1 and is the smaller change.
    expect(findings[0]!.fix).toEqual({ kind: 'rebind-fill', variableId: 'v-mid', variableName: 'text/muted' })
    expect(findings[0]!.fixLabel).toMatch(/^Fix: text\/weak → text\/muted \(\d+(\.\d+)?:1\)$/)
    expect(findings[1]!.fix).toMatchObject({ kind: 'rebind-fill', variableName: 'text/muted' })
    expect(findings[1]!.meta).toContain('Ikea mode')
    expect(findings[0]!.fixable).toBe(true)
  })

  it('passes large and high-contrast text, skips unmeasurable backdrops, and respects switched-off rules', () => {
    const good = text({ runs: [{ characters: 'Pay', fontSize: 14, fontWeight: 400, fontStyle: 'Regular', fill: { hex: '#000000', rgb: rgb(0, 0, 0), alpha: 1 } }] })
    const large = text({ id: 't2', runs: [{ characters: 'Hero', fontSize: 28, fontWeight: 400, fontStyle: 'Regular', fill: { hex: '#777777', rgb: rgb(0.47, 0.47, 0.47), alpha: 1 } }] })
    const image = text({ id: 't3', backdrop: null, backdropReason: 'sits on an image fill' })
    expect(accessibilityFindings(inventory([good, large, image]), ctx, null).findings.filter((f) => f.rule === '1.4.3')).toEqual([])
    expect(accessibilityFindings(inventory([text({})]), { rules: new Set(['2.5.8']), mode: 'suggest' }, null).findings).toEqual([])
    // Review mode lists the issue but offers no apply.
    const review = accessibilityFindings(inventory([text({})]), { rules: new Set(), mode: 'review' }, null).findings[0]!
    expect(review.fixable).toBe(false)
  })

  it('flags faint borders, small targets, truncating text, unnamed images and control sets without focus', () => {
    const nodes = [
      node({ id: 'b', name: 'Input', stroke: { hex: '#dddddd', rgb: rgb(0.87, 0.87, 0.87), alpha: 1 }, strokeWeight: 1 }),
      node({ id: 'c', name: 'Close', isInstance: true, mainName: 'Icon button', width: 16, height: 16 }),
      node({ id: 'd', name: 'Image', hasImageFill: true }),
      node({ id: 'e', name: 'Button', type: 'COMPONENT_SET', childrenCount: 6 }),
      node({ id: 'f', name: 'Divider', stroke: { hex: '#eeeeee', rgb: rgb(0.93, 0.93, 0.93), alpha: 1 }, strokeWeight: 1 }),
    ]
    const clipped = text({ id: 't9', characters: 'A longer helper sentence that explains', autoResize: 'NONE', truncates: true, height: 18, runs: [{ characters: 'A longer helper sentence that explains', fontSize: 14, fontWeight: 400, fontStyle: 'Regular', fill: { hex: '#000000', rgb: rgb(0, 0, 0), alpha: 1 } }] })
    const { findings } = accessibilityFindings(inventory([clipped], nodes), ctx, null)
    expect(findings.map((f) => f.rule).sort()).toEqual(['1.1.1', '1.4.11', '1.4.12', '2.4.7', '2.5.8'])
    const target = findings.find((f) => f.rule === '2.5.8')!
    expect(target.fix).toEqual({ kind: 'resize', width: 24, height: 24 })
    expect(target.fixable).toBe(false)
    expect(findings.find((f) => f.rule === '1.4.11')!.nodeIds).toEqual(['b'])
  })
})

describe('design system rules', () => {
  const palette = { colors: [{ id: 'v-accent', name: 'surface/accent', rgb: rgb(0.047, 0.549, 0.914), scopes: ['ALL_FILLS'] }], numbers: [{ id: 'v-12', name: 'space/inline-md', value: 12, scopes: ['GAP'] }, { id: 'v-r4', name: 'radius/sm', value: 4, scopes: ['CORNER_RADIUS'] }] }

  it('rebinds raw colours that equal a token, flags off-scale spacing and bound-less radii', () => {
    const n = node({
      fills: [{ hex: '#0c8ce9', rgb: rgb(0.047, 0.549, 0.914), alpha: 1 }],
      layout: { itemSpacing: { value: 12 }, paddingLeft: { value: 13 }, paddingRight: { value: 16 }, paddingTop: { value: 8, variableId: 'v', variableName: 'space/x' }, paddingBottom: { value: 8, variableId: 'v', variableName: 'space/x' } },
      cornerRadius: { value: 4 },
    })
    const { findings } = designSystemFindings(inventory([], [n]), ctx, palette)
    expect(findings.map((f) => [f.rule, f.fixLabel])).toEqual([
      ['raw-colour', 'Fix: bind to surface/accent'],
      ['off-scale', 'Fix: bind to space/inline-md'],
      ['off-scale', 'Fix: use 12 from the spacing scale'],
      ['raw-radius', 'Fix: bind to radius/sm'],
    ])
    expect(findings[0]!.fix).toEqual({ kind: 'rebind-fill', variableId: 'v-accent', variableName: 'surface/accent' })
    expect(findings[1]!.fix).toEqual({ kind: 'bind-number', field: 'itemSpacing', variableId: 'v-12', variableName: 'space/inline-md' })
    expect(findings[2]!.fixable).toBe(false)
  })

  it('reports detached instances and unstyled text, leaves nested instance layers alone', () => {
    const { findings } = designSystemFindings(inventory([text({ styled: false, fontFamily: 'Inter' }), text({ id: 't2', styled: false, inInstance: true })], [node({ detachedFrom: 'a local component' }), node({ id: 'x', inInstance: true, fills: [{ hex: '#ff0000', rgb: rgb(1, 0, 0), alpha: 1 }] })]), ctx, null)
    expect(findings.map((f) => f.rule)).toEqual(['detached', 'unstyled-text'])
    expect(findings[1]!.title).toContain('Inter 14')
  })
})

describe('content rules', () => {
  it('finds lorem ipsum, filler, fake people and placeholder data, and grey image boxes', () => {
    const texts = [
      text({ id: 'a', characters: 'Lorem ipsum dolor sit amet, consectetur' }),
      text({ id: 'b', characters: 'Text goes here' }),
      text({ id: 'c', characters: 'John Doe' }),
      text({ id: 'd', characters: 'jane@example.com' }),
      text({ id: 'e', characters: 'Pay £42.00' }),
    ]
    expect(placeholderTexts(inventory(texts)).map((h) => [h.text.id, h.rule])).toEqual([['a', 'placeholder-text'], ['b', 'placeholder-text'], ['c', 'fake-names'], ['d', 'placeholder-data']])
    const nodes = [node({ id: 'img', name: 'Image', fills: [{ hex: '#cccccc', rgb: rgb(0.8, 0.8, 0.8), alpha: 1 }], childrenCount: 0, width: 120, height: 120 })]
    const { findings } = contentFindings(inventory(texts, nodes), ctx, new Map([['a', 'Your order ships in 2–3 working days.']]))
    expect(findings.map((f) => f.rule)).toEqual(['placeholder-text', 'placeholder-text', 'fake-names', 'placeholder-data', 'placeholder-images'])
    expect(findings[0]).toMatchObject({ severity: 'serious', fixable: true, fix: { kind: 'replace-text', text: 'Your order ships in 2–3 working days.' } })
    expect(findings[1]).toMatchObject({ fixable: false, fix: { kind: 'manual' } })
  })
})

describe('localization rules', () => {
  it('estimates expansion from the W3C table, scaled per locale', () => {
    const de = LOCALES[0]!
    expect(expansion(5, de)).toBeCloseTo(2.4)
    expect(expansion(80, de)).toBeCloseTo(1.3)
    expect(expansion(5, LOCALES[1]!)).toBeLessThan(expansion(5, de))
    expect(estimateWidth('Pay now', 14)).toBeCloseTo(7 * 14 * 0.52)
  })

  it('flags single-line boxes without room, directional icons and US formats', () => {
    const tight = text({ id: 'a', characters: 'Pay now', autoResize: 'NONE', width: 60, height: 20 })
    const roomy = text({ id: 'b', characters: 'Pay now', autoResize: 'NONE', width: 400, height: 20 })
    const auto = text({ id: 'c', characters: 'Pay now' })
    expect(overflowRisk(tight).map((r) => r.locale.code)).toEqual(['de', 'fr', 'ar'])
    expect(overflowRisk(roomy)).toEqual([])
    expect(overflowRisk(auto)).toEqual([])
    const date = text({ id: 'd', characters: 'Delivery 12/31/2026' })
    const { findings } = localizationFindings(inventory([tight, roomy, auto, date], [node({ id: 'i', name: 'Chevron right', isInstance: true, mainName: 'Chevron' })]), ctx)
    expect(findings.map((f) => f.rule)).toEqual(['expansion', 'formats', 'rtl'])
    expect(findings[0]!.title).toMatch(/may overflow in German, French, Arabic \(German needs about \d+% more width\)/)
  })
})

describe('model-backed reviews', () => {
  const texts = [text({ id: 'a', characters: 'Recieve your order' }), text({ id: 'b', characters: 'Recieve your order' }), text({ id: 'c', characters: '42' }), text({ id: 'd', characters: 'Submit', role: 'button' })]

  it('dedupes texts into numbered items and batches them', () => {
    const items = reviewItems(texts)
    expect(items.map((i) => [i.index, i.text, i.role])).toEqual([[0, 'Recieve your order', 'button'], [1, 'Submit', 'button']])
    const many = Array.from({ length: 130 }, (_, i) => ({ index: i, id: `${i}`, text: `t${i}`, role: 'body', path: 'p' }))
    expect(batches(many).map((b) => b.length)).toEqual([60, 60, 10])
  })

  it('writes the prompt per agent and reads the reply into findings that reach every twin layer', () => {
    expect(systemPromptFor('spelling', 'Call it Checkout, never Basket.', new Set())).toContain('Call it Checkout')
    expect(systemPromptFor('writing', '', new Set(['button-verbs']))).not.toContain('"sentence-case"')
    expect(systemPromptFor('content', '', new Set())).toContain('placeholder copy')
    const items = reviewItems(texts)
    const rows = parseReview('Sure:\n```json\n{"findings":[{"index":0,"rule":"spelling","severity":"moderate","issue":"“Recieve” is misspelled.","suggestion":"Receive your order"},{"index":7,"rule":"x","issue":"ghost"},{"index":1,"rule":"nonsense","severity":"weird","issue":"Submit says nothing","suggestion":"Submit"}]}\n```', items, ['spelling', 'grammar'])
    expect(rows).toEqual([
      { index: 0, rule: 'spelling', severity: 'moderate', issue: '“Recieve” is misspelled.', suggestion: 'Receive your order' },
      { index: 1, rule: 'spelling', severity: 'moderate', issue: 'Submit says nothing', suggestion: null },
    ])
    const findings = reviewFindings('spelling', ctx, rows, items, texts)
    expect(findings[0]).toMatchObject({ title: '“Recieve” is misspelled', nodeIds: ['a', 'b'], fixable: true, fix: { kind: 'replace-text', text: 'Receive your order' } })
    expect(findings[0]!.meta).toBe('Spelling · Checkout › Pay button › Label · 2 layers')
    expect(findings[1]!.fixable).toBe(false)
  })
})

describe('shared helpers', () => {
  it('groups identical findings across layers and scores by weighted penalty', () => {
    const base = accessibilityFindings(inventory([text({ id: 'a' }), text({ id: 'b' })]), ctx, null).findings
    expect(base).toHaveLength(1)
    expect(base[0]!.nodeIds).toEqual(['a', 'b'])
    expect(base[0]!.meta).toContain('+1 more')
    expect(groupFindings([])).toEqual([])
    expect(score([], 10)).toBe(100)
    expect(score(base, 2)).toBe(0)
    expect(score(base, 40)).toBe(90)
  })

  it('finds the nearest passing and nearest matching palette colours', () => {
    const palette = [{ id: 'a', name: 'light', rgb: rgb(0.9, 0.9, 0.9), scopes: [] }, { id: 'b', name: 'dark', rgb: rgb(0.1, 0.1, 0.1), scopes: [] }]
    expect(nearestPassing(rgb(0.5, 0.5, 0.5), WHITE, 4.5, palette)?.name).toBe('dark')
    expect(nearestPassing(rgb(0.5, 0.5, 0.5), WHITE, 30, palette)).toBeNull()
    expect(nearestColor(rgb(0.91, 0.9, 0.9), palette)?.name).toBe('light')
    expect(nearestColor(rgb(0.5, 0.5, 0.5), palette)).toBeNull()
  })
})
