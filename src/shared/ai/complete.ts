// One completion against whichever provider is configured: build the request,
// send it with a timeout, map the failure, read the text. Pure apart from fetch.
import { claude } from './claude'
import { gemini } from './gemini'
import { openai } from './openai'
import { AiError, PROVIDER_LABEL, type AiFetch, type CompleteOptions, type Provider, type ProviderAdapter, type ProviderConfig } from './types'

export const ADAPTERS: Record<Provider, ProviderAdapter> = { claude, openai, gemini }

/** A long context plus a slow model can take a while; the UI waits a bit longer than this. */
export const AI_TIMEOUT_MS = 75_000

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms)
  work.then((v) => { clearTimeout(timer); resolve(v) }, (e: unknown) => { clearTimeout(timer); reject(e) })
})

/** One request; returns the reply's text. Every failure is an AiError with a sentence for the designer. */
export async function complete(config: Pick<ProviderConfig, 'provider' | 'model' | 'apiKey'>, options: CompleteOptions, fetchImpl: AiFetch): Promise<string> {
  const adapter = ADAPTERS[config.provider]
  const label = PROVIDER_LABEL[config.provider]
  let res: { status: number; text(): Promise<string> }
  let body: string
  try {
    res = await withTimeout(fetchImpl(adapter.url(config.model), {
      method: 'POST',
      headers: adapter.headers(config.apiKey),
      body: JSON.stringify(adapter.body(config.model, options)),
    }), options.timeoutMs ?? AI_TIMEOUT_MS)
    body = await res.text()
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.message === 'timeout'
    throw new AiError(timedOut ? `${label} took too long to answer. Try a smaller scope or a faster model.` : `Couldn’t reach ${label}. Check your connection and try again.`, 0, config.provider)
  }
  if (res.status < 200 || res.status >= 300) throw adapter.failure(res.status, body, config.model)
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new AiError(`${label} sent a reply that isn’t JSON. Try asking again.`, res.status, config.provider)
  }
  try {
    return adapter.text(parsed)
  } catch (error: unknown) {
    const refused = error instanceof Error && error.message === 'refusal'
    throw new AiError(refused ? `${label} declined to answer this one.` : `${label} sent an empty or unreadable reply. Try asking again.`, res.status, config.provider)
  }
}
