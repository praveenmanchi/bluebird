// Every Figma variant of every token-bound set must have a story that names it,
// so the visual-diff runner (Phase 3) can pair Storybook renders with Figma exports.
import { describe, it, expect } from 'vitest'
import { FIGMA_COMPONENTS } from '../../src/shared/brand/generated/tokens'

const modules = import.meta.glob(['../../src/shared/ui/*/*.stories.tsx', '../../src/shell/*.stories.tsx', '../../src/features/*/ui/*.stories.tsx'], { eager: true }) as Record<string, Record<string, unknown>>

function coveredVariants(setId: string): string[] {
  const out: string[] = []
  for (const mod of Object.values(modules)) {
    const meta = mod.default as { parameters?: { figma?: { setId?: string } } } | undefined
    if (meta?.parameters?.figma?.setId !== setId) continue
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default') continue
      const variant = (story as { parameters?: { figma?: { variant?: string } } })?.parameters?.figma?.variant
      if (variant) out.push(variant)
    }
  }
  return out
}

describe('Figma variant → story coverage', () => {
  for (const [code, set] of Object.entries(FIGMA_COMPONENTS)) {
    it(`${code} has a story for each of its ${set.variants.length} Figma variants`, () => {
      const expected = set.variants.map((v) => v.name).sort()
      const actual = coveredVariants(set.id).sort()
      expect(actual).toEqual(expected)
    })
  }
})
