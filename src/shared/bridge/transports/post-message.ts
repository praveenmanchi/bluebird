import { parseMessage } from '../messages'
import type { Transport } from '../transport'

/** Production transport: the UI iframe inside Figma talking to the sandbox. */
export function createPostMessageTransport(): Transport {
  return {
    send(message) {
      window.parent.postMessage({ pluginMessage: message }, '*')
    },
    subscribe(listener) {
      const onMessage = (event: MessageEvent) => {
        const parsed = parseMessage(event.data?.pluginMessage)
        if (parsed) listener(parsed)
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    },
  }
}
