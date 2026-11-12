// Which persona this person picked on the first-run screen: one clientStorage entry
// per user. Reset wipes every `bluebird:` key, so the picker comes back after it.
import type { HandlerMap } from '@shared/bridge'
import type { PluginConfig } from '@shared/config'
import { PERSONA_MSG, type PersonaStatus } from '@shared/session'
import type { SessionStore } from './session'

import { PERSONA_KEY } from '@shared/session/persona-key'

export { PERSONA_KEY }

export function createPersonaHandlers(config: PluginConfig, store: SessionStore): HandlerMap {
  const known = (id: unknown): id is string => typeof id === 'string' && Object.keys(config.personas).includes(id)
  return {
    [PERSONA_MSG.status]: async (): Promise<PersonaStatus> => {
      const stored = await store.get(PERSONA_KEY)
      return { personaId: known(stored) ? stored : null }
    },
    [PERSONA_MSG.select]: async (payload: unknown): Promise<PersonaStatus> => {
      const personaId = (payload as { personaId?: unknown } | null)?.personaId
      if (!known(personaId)) throw new Error('Unknown persona.')
      await store.set(PERSONA_KEY, personaId)
      return { personaId }
    },
  }
}
