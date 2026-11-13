import { describe, it, expect } from 'vitest'
import { buildTour, hasTourStep, stepCounter, SETTINGS_TAB } from './steps'
import { personas } from '@shared/config'

describe('buildTour', () => {
  it('wraps the persona tabs with Welcome and Setup, in persona order', () => {
    const tour = buildTour([{ id: 'jira' }, { id: 'a11y' }])
    expect(tour.map((s) => s.id)).toEqual(['welcome', 'jira', 'a11y', 'setup'])
    expect(tour[0]?.tabId).toBeNull()
    expect(tour.at(-1)?.tabId).toBe(SETTINGS_TAB)
  })

  it('leaves out tabs that have no demo scene', () => {
    expect(buildTour([{ id: 'changelog' }, { id: 'mcp' }]).map((s) => s.id)).toEqual(['welcome', 'mcp', 'setup'])
    expect(hasTourStep('changelog')).toBe(false)
    expect(hasTourStep('publish')).toBe(true)
    expect(hasTourStep('constructor')).toBe(false)
  })

  it('still welcomes and sets up a persona with no tabs', () => {
    expect(buildTour([]).map((s) => s.scene)).toEqual(['welcome', 'setup'])
  })

  it('covers every tab the shipped personas use', () => {
    for (const persona of personas) for (const tab of persona.tabs) expect(hasTourStep(tab.id), `${persona.id} › ${tab.id}`).toBe(true)
  })
})

describe('stepCounter', () => {
  it('pads both numbers like the Figma counter', () => {
    expect(stepCounter(1, 7)).toBe('02 / 07')
    expect(stepCounter(10, 12)).toBe('11 / 12')
  })
})

describe('buildTour with the import step', () => {
  it('ends on importing a team setup file, on the Settings tab', () => {
    const tour = buildTour([{ id: 'jira' }], { importStep: true })
    expect(tour.map((s) => s.id)).toEqual(['welcome', 'jira', 'setup', 'import'])
    expect(tour.at(-1)).toMatchObject({ scene: 'import', tabId: SETTINGS_TAB, title: 'Got a team settings file?' })
  })
})
