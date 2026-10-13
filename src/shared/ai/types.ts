// One chat-completion contract for the three providers Settings › AI Agent
// Assistance can hold. Runs in the Figma sandbox (no URL global, fetch
// injected) and in the browser dev harness; the key only ever goes to the
// provider's own host.

export type Provider = 'claude' | 'openai' | 'gemini'

export const PROVIDERS: readonly Provider[] = ['claude', 'openai', 'gemini']

export const PROVIDER_LABEL: Record<Provider, string> = { claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini' }

export interface ProviderConfig {
  provider: Provider
  model: string
  apiKey: string
  /** The design-system team's custom instructions (Settings), already trimmed. */
  instructions: string
  /** True when Settings named another provider but only this one had a key. */
  fallback: boolean
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export interface CompleteOptions {
  system: string
  messages: readonly ChatMessage[]
  /** Output cap. Each provider spells it differently; the default suits a short answer. */
  maxTokens?: number
  /** Ask the provider for JSON (where it has a switch for it); the prompt must still say what shape. */
  json?: boolean
  /** Per-request timeout; the UI waits a little longer than this. */
  timeoutMs?: number
}

/** The subset of fetch the sandbox (Figma's fetch), the browser and tests all provide. */
export type AiFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ status: number; text(): Promise<string> }>

export class AiError extends Error {
  constructor(message: string, readonly status: number, readonly provider: Provider) {
    super(message)
    this.name = 'AiError'
  }
}

/** One provider's HTTP shape: where to post, what to send, and how to read the reply. */
export interface ProviderAdapter {
  provider: Provider
  url(model: string): string
  headers(apiKey: string): Record<string, string>
  body(model: string, options: CompleteOptions): unknown
  /** The reply's text; throws (a plain Error) when there is none. */
  text(parsed: unknown): string
  /** Turns a non-2xx status plus its body into a sentence for the designer. */
  failure(status: number, body: string, model: string): AiError
}

/** A request that reads the body as HTTP (status, text) regardless of how the provider failed. */
export interface HttpReply { status: number; text(): Promise<string> }
