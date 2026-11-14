import { describe, it, expect } from 'vitest'
import { CANVAS_WRITES } from './canvas-writes'
import { MSG as A11Y } from '@features/a11y/messages'
import { MSG as VARMAPPER } from '@features/varmapper/messages'

describe('CANVAS_WRITES', () => {
  it('lists the actions that draw on or edit the canvas', () => {
    expect(CANVAS_WRITES).toEqual(expect.arrayContaining([A11Y.applyFix, A11Y.createReport, A11Y.createSpec, VARMAPPER.bind, VARMAPPER.undo]))
  })

  it('leaves out reads, plugin data and annotations, which Dev Mode allows', () => {
    for (const type of [A11Y.scan, A11Y.ignore, A11Y.annotate, A11Y.focus, VARMAPPER.check]) expect(CANVAS_WRITES).not.toContain(type)
  })

  it('names each message once', () => {
    expect(new Set(CANVAS_WRITES).size).toBe(CANVAS_WRITES.length)
  })
})
