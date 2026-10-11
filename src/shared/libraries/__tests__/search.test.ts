import { describe, it, expect } from 'vitest'
import { toComponents, toVariables } from '../normalize'
import { impliedType, queryTerms, searchComponents, searchVariables } from '../search'
import { COMPONENT_SETS, COMPONENTS, VARIABLES } from './fixtures'

const index = { variables: toVariables(VARIABLES, 'F').variables, components: toComponents(COMPONENTS, COMPONENT_SETS, 'F') }

describe('search', () => {
  it('drops filler words and expands design-system synonyms', () => {
    expect(queryTerms('What is our primary colour?')).toEqual([['primary', 'accent', 'brand']])
    expect(impliedType('What is our primary colour?')).toBe('COLOR')
    expect(impliedType('row spacing')).toBe('FLOAT')
    expect(impliedType('Show me the Button')).toBeUndefined()
  })

  it('finds the primary colour through its accent name', () => {
    const hits = searchVariables(index, 'What is our primary colour?')
    expect(hits.items[0]!.name).toBe('surface/accent')
    expect(hits.items.every((v) => v.type === 'COLOR')).toBe(true)
  })

  it('finds spacing among numbers only', () => {
    expect(searchVariables(index, 'What padding do rows use?').items.map((v) => v.name)).toEqual(['space/inset-md'])
  })

  it('finds components by name and description, and says when nothing matches', () => {
    expect(searchComponents(index, 'Show me the Button atom').items[0]!.name).toBe('Button')
    expect(searchComponents(index, 'separator').items.map((c) => c.name)).toEqual(['Divider'])
    expect(searchComponents(index, 'carousel')).toEqual({ items: [], total: 0 })
  })
})
