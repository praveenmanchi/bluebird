import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Figma colours the persona screens with persona/*, so these files must not borrow another
// feature's colours: a change meant for the Agents tab or onboarding would repaint the birds.
const FILES = ['src/shell/PersonaScreen.css', 'src/shell/SplashScreen.css', 'src/shell/persona/Bird.css', 'src/shell/persona/PersonaBird.css']
const BORROWED = /var\(--bb-(?:agents-bot-|feedback-|banner-|text-|border-(?:default|focus)|surface-(?!translucent)|onboarding-(?:surface|text|field|border-(?!width)))[a-z0-9-]*/g

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('persona colour tokens', () => {
  it.each(FILES)('%s reads only persona colours', (file) => {
    expect(read(file).match(BORROWED) ?? []).toEqual([])
  })

  it('paints each bird with the role Figma binds, not the class name', () => {
    const css = read('src/shell/persona/Bird.css')
    expect(css).toMatch(/\.bb-bird--ui-designer \.bb-bird__gear \{ fill: var\(--bb-persona-bird-gear-alt\)/)
    expect(css).toMatch(/\.bb-bird__gear-alt \{ fill: var\(--bb-persona-bird-ink\)/)
    expect(css).toMatch(/\.bb-bird--design-system \.bb-bird__gear-alt \{ fill: var\(--bb-persona-bird-eye\)/)
    expect(css).toMatch(/\.bb-bird--content \.bb-bird__gear-alt \{ fill: var\(--bb-persona-bird-ui-designer\)/)
  })
})
