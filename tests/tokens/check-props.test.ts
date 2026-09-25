// The TSX prop reader — the half of the property gate that is easy to get subtly wrong.
// The gate itself is covered end-to-end by `npm run tokens:check`.
import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPropNames } from '../../scripts/check-props'

const write = (name: string, source: string) => {
  const file = join(mkdtempSync(join(tmpdir(), 'bb-props-')), name)
  writeFileSync(file, source)
  return file
}

describe('readPropNames', () => {
  it('reads an interface, including members inherited from the same file', () => {
    const file = write('X.tsx', `
      interface Base { id?: string }
      export interface XProps extends Base { label?: string; onPick?: (v: string) => void }
      export function X({ label }: XProps) { return null }
    `)
    expect(readPropNames(file)).toEqual(new Set(['id', 'label', 'onPick']))
  })

  it('reads a type alias', () => {
    const file = write('Y.tsx', 'export type YProps = { tone?: "a" | "b"; children?: unknown }')
    expect(readPropNames(file)).toEqual(new Set(['tone', 'children']))
  })

  it('ignores heritage it cannot resolve rather than guessing', () => {
    const file = write('Z.tsx', `
      export interface ZProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'icon'> { value?: number }
    `)
    // `value` is ours; nothing from the opaque Omit<…> is invented.
    expect(readPropNames(file)).toEqual(new Set(['value']))
  })

  it('falls back to the destructuring pattern when props are typed inline', () => {
    const file = write('W.tsx', 'export function W({ open, onClose }: { open: boolean; onClose: () => void }) { return null }')
    const names = readPropNames(file)
    expect(names.has('open')).toBe(true)
    expect(names.has('onClose')).toBe(true)
  })

  it('handles a nested object type without tripping over the inner members', () => {
    const file = write('N.tsx', `
      export interface NProps { colors?: { fg: string; bg: string }; node?: string }
    `)
    expect(readPropNames(file)).toEqual(new Set(['colors', 'node']))
  })

  it('returns an empty set for a missing file instead of throwing', () => {
    expect(readPropNames('/definitely/not/here.tsx')).toEqual(new Set())
  })
})
