import { describe, it, expect } from 'vitest'
import { MOCK_SELECTION, SAMPLE_LIBRARY } from '../fixtures'
import { checkSelection, groundedAnswer, librarySources, modeSummary, selectIndex, selectionFailedAnswer, typeSpec } from '../grounding'

describe('grounded answers', () => {
  it('answers a colour question from the Variables file with every mode', () => {
    const a = groundedAnswer('What is our primary colour?', 'color', SAMPLE_LIBRARY)
    expect(a.text).toBe('surface/accent (Brand UI) is #0C8CE9 in Bridge and #161616 in Ikea. Primary actions and selection.')
    expect(a.steps).toEqual(['Searched Brand UI (4 variables, 1 collection)', 'Matched 1 variable for “primary”'])
    expect(a.variables?.items.map((v) => v.name)).toEqual(['surface/accent'])
  })

  it('answers a component question from the Components file', () => {
    const a = groundedAnswer('Show me the Button atom', 'component', SAMPLE_LIBRARY)
    expect(a.text).toContain('Button is a component set with 12 variants in Components › Atoms (Components).')
    expect(a.components?.items[0]!.nodeId).toBe('40000040:5139')
  })

  it('answers a typography question from the published text styles, largest first in the panel', () => {
    const a = groundedAnswer('Which type styles do we have?', 'type', SAMPLE_LIBRARY)
    expect(a.text).toBe('2 text styles in Brand UI, set in Noto Sans, from 11 to 16 px. The ramp is below, largest first.')
    expect(a.steps[0]).toBe('Read 2 published text styles from Brand UI')
    expect(a.styles?.items.map((s) => s.name)).toEqual(['Title/Semantics', 'Body/Regular'])
    const one = groundedAnswer('What is the title text style?', 'type', SAMPLE_LIBRARY)
    expect(one.text).toBe('Title/Semantics (Brand UI) is Noto Sans Semi Bold, 16/22.4 · Semi Bold. Section titles.')
    expect(typeSpec({ ...SAMPLE_LIBRARY.styles![1]!, letterSpacing: -0.5, textCase: 'UPPER' } as never)).toBe('11/15.4 · Regular · -0.5 · upper')
    // Without text styles, font variables still answer.
    expect(groundedAnswer('type', 'type', { ...SAMPLE_LIBRARY, styles: [] }).text).toContain('Nothing in')
  })

  it('answers a colour question from colour styles when no variable matches', () => {
    const a = groundedAnswer('legacy colour', 'color', SAMPLE_LIBRARY)
    expect(a.text).toContain('Legacy/Accent (Brand UI) is a colour style resolving to #0C8CE9.')
    expect(a.styles?.items[0]).toMatchObject({ kind: 'color', hex: '#0C8CE9' })
  })

  it('falls back to the other kind, then says nothing matched', () => {
    expect(groundedAnswer('status icons', 'color', SAMPLE_LIBRARY).components?.items[0]!.name).toBe('Status error icons')
    expect(groundedAnswer('carousel', 'color', SAMPLE_LIBRARY).text).toContain('Nothing in Brand UI and Components matches “carousel”')
  })

  it('only searches ticked files', () => {
    const onlyComponents = selectIndex(SAMPLE_LIBRARY, new Set(['COMP2']))
    expect(onlyComponents.variables).toHaveLength(0)
    expect(groundedAnswer('row background', 'color', onlyComponents).variables).toBeUndefined()
  })

  it('asks for a selection when there is none', () => {
    expect(groundedAnswer('What variables are used in this?', 'selection', SAMPLE_LIBRARY, null).text).toMatch(/^Select a layer in Figma/)
  })

  it('ties selection bindings to the library by key, then by name, and flags the rest', () => {
    const report = checkSelection(MOCK_SELECTION, SAMPLE_LIBRARY)
    expect(report.variables.map((v) => [v.name, v.origin, v.byName ?? false])).toEqual([
      ['jira/row/bg/selected', 'library', false],
      ['jira/row/border/selected', 'other', false],
      ['jira/text/key', 'library', true],
      ['jira/space/row-x', 'library', false],
      ['ticket/legacy-blue', 'local', false],
    ])
    expect(report.components.map((c) => [c.name, c.origin])).toEqual([['Ticket Row', 'library'], ['Status error icons', 'library'], ['Avatar', 'local']])
    const a = groundedAnswer('What variables are used in this?', 'selection', SAMPLE_LIBRARY, MOCK_SELECTION)
    expect(a.text).toBe('Ticket Row binds 5 variables (3 from Brand UI, 1 local to this file and 1 from a library you haven’t connected) and uses 3 components (2 from Components and 1 local to this file). 3 items aren’t from your connected libraries — check those first.')
  })

  it('won’t match by a name two library items share, and notes unread selected layers', () => {
    const twice = { ...SAMPLE_LIBRARY, variables: [...SAMPLE_LIBRARY.variables, { ...SAMPLE_LIBRARY.variables[2]!, id: 'dup', key: 'dup', fileKey: 'COMP2' }] }
    expect(checkSelection(MOCK_SELECTION, twice).variables.find((v) => v.name === 'jira/text/key')!.origin).toBe('other')
    expect(groundedAnswer('What variables are used in this?', 'selection', SAMPLE_LIBRARY, { ...MOCK_SELECTION, selected: 3 }).text).toContain('select one layer at a time to check the other 2')
    expect(selectionFailedAnswer('timed out').text).toMatch(/^I couldn’t read your selection in Figma: timed out/)
  })

  it('summarises modes and builds source cards per file', () => {
    expect(modeSummary({ ...SAMPLE_LIBRARY.variables[0]!, values: ['A', 'B', 'C', 'D', 'E'].map((mode) => ({ mode, value: '#000000' })) }))
      .toBe('#000000 in A, #000000 in B, #000000 in C and 2 more modes')
    const cards = librarySources({ ...SAMPLE_LIBRARY, files: [...SAMPLE_LIBRARY.files, { slot: 2, fileKey: 'BAD', name: 'BAD', roles: ['components'], variables: 0, components: 0, collections: [], error: 'Figma couldn’t find File 2.' }] })
    expect(cards.map((c) => [c.name, c.status, c.selected])).toEqual([['Brand UI', 'Indexed', true], ['Components', 'Indexed', true], ['BAD', 'Failed', false]])
    expect(cards[0]!.meta).toBe('Variables · File 1 · 4 variables · 1 collection · 3 styles')
  })
})
