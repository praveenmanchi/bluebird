import { describe, it, expect } from 'vitest'
import { safeFilename } from '../ui/download'

describe('safeFilename', () => {
  it('joins the parts with an em dash and adds the extension', () => {
    expect(safeFilename(['Plugin UI', 'Home'], 'json')).toBe('Plugin UI — Home.json')
  })
  it('strips characters that break a filesystem', () => {
    expect(safeFilename(['a/b:c*d?e"f<g>h|i'], 'md')).toBe('a-b-c-d-e-f-g-h-i.md')
  })
  it('drops empty parts and trailing dots', () => {
    expect(safeFilename(['Plugin UI', '', 'Page.'], 'json')).toBe('Plugin UI — Page.json')
  })
  it('falls back to a usable name when everything is stripped', () => {
    expect(safeFilename(['///'], 'json')).toBe('accessibility-report.json')
  })
})
