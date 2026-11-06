import { describe, it, expect } from 'vitest'
import { PERSONA_MSG, type PersonaStatus } from '@shared/session'
import { config } from '@shared/config'
import type { Handler, HandlerContext } from '@shared/bridge'
import { mockSessionStore } from '../../tests/mocks/handlers'
import { createPersonaHandlers, PERSONA_KEY } from './persona'

const setup = () => {
  const store = mockSessionStore()
  const handlers = createPersonaHandlers(config, store)
  const call = (type: string, payload?: unknown) => (handlers[type] as Handler)(payload, {} as HandlerContext) as Promise<PersonaStatus>
  const status = () => call(PERSONA_MSG.status)
  const select = (personaId: unknown) => call(PERSONA_MSG.select, { personaId })
  return { store, status, select }
}

describe('persona handlers', () => {
  it('has no persona until one is picked, then remembers it', async () => {
    const { status, select } = setup()
    expect(await status()).toEqual({ personaId: null })
    await select('developer')
    expect(await status()).toEqual({ personaId: 'developer' })
  })

  it('refuses a persona the config does not define', async () => {
    const { store, select } = setup()
    await expect(select('wizard')).rejects.toThrow('Unknown persona.')
    await expect(select('constructor')).rejects.toThrow('Unknown persona.')
    expect(await store.get(PERSONA_KEY)).toBeUndefined()
  })

  it('reads a stored persona that left the config as not picked', async () => {
    const { store, status } = setup()
    await store.set(PERSONA_KEY, 'product-designer')
    expect(await status()).toEqual({ personaId: null })
  })
})
