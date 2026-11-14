import { describe, it, expect, vi } from 'vitest'
import { DEV_MODE_READ_ONLY, editorModeOf, guardCanvasWrites } from '../mode'
import type { HandlerMap } from '@shared/bridge/sandbox-router'

describe('editorModeOf', () => {
  it('treats only Dev Mode as read-only', () => {
    expect(editorModeOf('dev')).toBe('dev')
    expect(editorModeOf('figma')).toBe('design')
    expect(editorModeOf(undefined)).toBe('design')
  })
})

describe('guardCanvasWrites', () => {
  const write = vi.fn(() => 'drawn')
  const read = vi.fn(() => 'read')
  const handlers: HandlerMap = { 'tab:draw': write, 'tab:scan': read }
  const ctx = { emit: () => undefined }

  it('returns the same map in Design Mode', () => {
    expect(guardCanvasWrites(handlers, ['tab:draw'], 'design')).toBe(handlers)
  })

  it('turns listed writes away in Dev Mode and leaves the rest alone', async () => {
    const guarded = guardCanvasWrites(handlers, ['tab:draw'], 'dev')
    await expect(async () => guarded['tab:draw']!(undefined as never, ctx)).rejects.toThrow(DEV_MODE_READ_ONLY)
    expect(write).not.toHaveBeenCalled()
    expect(guarded['tab:scan']!(undefined as never, ctx)).toBe('read')
  })

  it('builds a new map instead of changing the one it was given', () => {
    guardCanvasWrites(handlers, ['tab:draw'], 'dev')
    expect(handlers['tab:draw']).toBe(write)
  })
})
