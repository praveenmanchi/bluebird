import { describe, it, expect } from 'vitest'
import { buildSpecDoc, readingOrder, type CollectedControl, type SpecInput } from '../doc/spec-doc'
import { humanName, notesFor, roleFor } from '../doc/spec-roles'

const box = (x: number, y: number, width = 40, height = 32) => ({ x, y, width, height })
const control = (over: Partial<CollectedControl>): CollectedControl => ({
  nodeId: 'n', name: 'Button', component: 'Button', role: 'button', text: 'Scan', states: ['Default', 'Hover', 'Focus'], detached: false, box: box(0, 0), ...over,
})

const input: SpecInput = {
  rootId: 'root', rootName: 'Results', rootSize: { width: 480, height: 640 },
  controls: [
    control({ nodeId: 'scan', text: 'Scan', box: box(380, 60) }),
    control({ nodeId: 'platform', name: 'Platform', component: 'Dropdown', role: 'combobox', text: 'Web', states: ['Default', 'Open'], box: box(16, 62) }),
    control({ nodeId: 'gear', name: 'settings', component: 'Icon button', text: '', box: box(440, 10, 24, 24) }),
    control({ nodeId: 'row', name: 'Frame 12', component: undefined, text: 'Open', states: [], detached: true, box: box(16, 300) }),
  ],
  headings: [{ nodeId: 'h', text: 'Scan summary', level: 2, box: box(16, 120) }],
  landmarks: [{ nodeId: 'l', name: 'Header', role: 'banner', box: box(0, 0, 480, 40) }],
  images: 1,
}

describe('roleFor', () => {
  it('reads the role from component and layer names, most specific first', () => {
    expect(roleFor(['Dropdown', 'Platform'], false)).toBe('combobox')
    expect(roleFor(['Tab sub menu'], false)).toBe('radiogroup')
    expect(roleFor(['Tab'], false)).toBe('tab')
    expect(roleFor(['Table'], false)).toBeNull()
    expect(roleFor(['Icon button'], false)).toBe('button')
    expect(roleFor(['Disclosure Toggle'], false)).toBe('disclosure')
  })

  it('treats an unnamed layer with a prototype interaction as a button', () => {
    expect(roleFor(['Frame 1430102558'], true)).toBe('button')
    expect(roleFor(['Frame 1430102558'], false)).toBeNull()
  })
})

describe('humanName', () => {
  it('cleans names and rejects generic ones', () => {
    expect(humanName('close-button')).toBe('Close button')
    expect(humanName('settings')).toBe('Settings')
    expect(humanName('Frame 1430102558')).toBeNull()
    expect(humanName('State=Default')).toBeNull()
  })
})

describe('readingOrder', () => {
  it('reads top to bottom, left to right within a line', () => {
    expect(readingOrder(input.controls).map((c) => c.nodeId)).toEqual(['gear', 'platform', 'scan', 'row'])
  })
})

describe('buildSpecDoc', () => {
  const doc = buildSpecDoc(input, { standard: 'wcag22', platform: 'web', openIssues: 0 }, '10 Nov 2026')

  it('numbers controls in focus order with role, name, states and keys', () => {
    expect(doc.rows.map((r) => [r.order, r.name])).toEqual([[1, 'Settings'], [2, 'Platform'], [3, 'Scan'], [4, 'Open']])
    expect(doc.rows[1]).toMatchObject({ role: 'button that opens a listbox', accessibleName: '“Platform: Web”', keyboard: expect.stringMatching(/Esc closes/) })
  })

  it('asks the designer for names it cannot know', () => {
    expect(doc.rows[0]).toMatchObject({ needsName: true, accessibleName: 'Suggested: “Settings”' })
  })

  it('flags controls with nothing to build a focus state from', () => {
    expect(doc.rows[1]).toMatchObject({ missingFocus: true, states: 'Default, Open · add Focus' })
    expect(doc.rows[3]).toMatchObject({ missingFocus: true, component: 'plain frame, not a component' })
  })

  it('lists what the spec depends on, with honest statuses', () => {
    expect(doc.dependencies.map((d) => [d.item, d.status.label])).toEqual([
      ['Audit issues fixed and re-scanned', 'Done'],
      ['Focus state on every interactive component', '2 missing'],
      ['Names for icon-only controls', 'Needs design input'],
      ['Images: alt text or decorative', 'Check by hand'],
      ['Controls come from the design system', '1 plain frame'],
      ['Status messages marked', 'Check by hand'],
    ])
  })

  it('says how many issues are open when the audit is not clean', () => {
    const open = buildSpecDoc(input, { platform: 'web', openIssues: 3 }, '10 Nov 2026')
    expect(open.dependencies[0]?.status).toEqual({ tone: 'critical', label: '3 open' })
  })

  it('writes QA checks for what is on the screen', () => {
    expect(doc.done[0]).toBe('Tab reaches 1 to 4 in order, with nothing skipped or trapped.')
    expect(doc.done).toContain('Esc closes every menu and returns focus to the control that opened it.')
    expect(doc.done).toContain('The screen reader lists the 1 landmark: banner.')
  })
})

describe('notesFor', () => {
  it('always covers focus and status messages, and adds notes for roles present', () => {
    expect(notesFor(new Set(['button']), false, 'web').map((n) => n.title)).toEqual(['Focus ring', 'Status messages'])
    expect(notesFor(new Set(['combobox']), true, 'ios').map((n) => n.title)).toEqual(['Focus', 'Icon-only buttons', 'Menus and dropdowns', 'Status messages'])
  })
})

import { headingLevels, landmarkFor, looksLikeHeading } from '../doc/spec-roles'

describe('landmarkFor', () => {
  it('maps region names to landmarks', () => {
    expect(landmarkFor('Site header')).toBe('banner')
    expect(landmarkFor('Footer')).toBe('contentinfo')
    expect(landmarkFor('Tab bar')).toBe('navigation')
    expect(landmarkFor('Main content')).toBe('main')
    expect(landmarkFor('Card')).toBeNull()
  })
})

describe('headings', () => {
  it('treats large or heading-styled text as headings, biggest first', () => {
    expect(looksLikeHeading(20, undefined, 'Scan summary')).toBe(true)
    expect(looksLikeHeading(12, 'Heading/Small', 'Findings')).toBe(true)
    expect(looksLikeHeading(12, 'Body', 'Findings')).toBe(false)
    expect(looksLikeHeading(32, undefined, '67%')).toBe(false)
    expect(looksLikeHeading(32, undefined, '1.4.3')).toBe(false)
    expect(headingLevels([32, 20, 20, 16, 40])).toEqual([2, 3, 3, 3, 1])
  })
})
