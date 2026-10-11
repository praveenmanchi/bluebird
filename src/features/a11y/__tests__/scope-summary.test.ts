import { describe, it, expect } from 'vitest'
import { describeTarget, summarizeScope, type SummaryNode } from '../scope-summary'
import { contrastRule, enabledCount, ALL_RULES, targetRule } from '../rules'

const text = (name = 'T'): SummaryNode => ({ type: 'TEXT', name })
const frame: SummaryNode = {
  type: 'FRAME', name: 'Login screen',
  children: [text(), text(), { type: 'INSTANCE', name: 'Button', children: [text()] }, { type: 'TEXT', name: 'hidden', visible: false }],
}

describe('summarizeScope', () => {
  it('counts visible text layers and instances under the selection', () => {
    const t = summarizeScope('selection', [frame], 'Page 1')
    expect(t).toEqual({ scope: 'selection', name: 'Login screen', selected: 1, frames: 1, textLayers: 3, instances: 1, truncated: false })
    expect(describeTarget(t)).toBe('1 frame selected · 3 text layers · 1 component instance')
  })

  it('names several layers by count, the page by name, and marks a cut-off walk', () => {
    expect(summarizeScope('selection', [frame, text('loose')], 'P').name).toBe('2 layers')
    expect(describeTarget(summarizeScope('selection', [frame, text('loose')], 'P'))).toMatch(/^2 layers selected/)
    const page = summarizeScope('page', [frame], 'Main screens', 2)
    expect(page).toMatchObject({ name: 'Main screens', truncated: true })
    expect(describeTarget(page)).toMatch(/^Whole page · \d+ text layers?\+/)
  })
})

describe('rules', () => {
  it('files each finding under one rule', () => {
    expect(contrastRule({ level: 'fail' })).toBe('1.4.3')
    expect(contrastRule({ level: 'aa' })).toBe('1.4.6')
    expect(targetRule({ width: 16, height: 40 })).toBe('2.5.8')
    expect(targetRule({ width: 30, height: 30 })).toBe('2.5.5')
    expect(enabledCount({ ...ALL_RULES, '1.4.6': false })).toBe(4)
  })
})
